const MAGIC = new Uint8Array([0x53, 0x45, 0x43, 0x53]); // "SECS"
const VERSION = 4;
const SALT_LEN = 32;
const IV_LEN = 12;
const KEY_LEN = 32;
const CHUNK_SIZE = 1024 * 1024; // 1MB

const ARGON2_TIME = 3;
const ARGON2_MEM = 65536;
const ARGON2_THREADS = 4;
const PBKDF2_ITERATIONS = 500000;

let argon2Ready = null;

async function loadArgon2() {
    if (argon2Ready) return argon2Ready;

    argon2Ready = (async () => {
        try {
            const resp = await fetch('https://cdn.jsdelivr.net/npm/argon2-browser@1.18.0/dist/argon2.wasm');
            if (!resp.ok) throw new Error('WASM fetch failed');
            const wasmBin = await resp.arrayBuffer();
            const wasmModule = await WebAssembly.instantiate(wasmBin, {});

            return {
                hash: (password, salt, time, mem, threads, hashLen) => {
                    const mod = wasmModule.instance.exports;
                    const pLen = password.length;
                    const sLen = salt.length;

                    const pPtr = mod.alloc(pLen);
                    const sPtr = mod.alloc(sLen);
                    const outPtr = mod.alloc(hashLen);

                    new Uint8Array(mod.memory.buffer, pPtr, pLen).set(password);
                    new Uint8Array(mod.memory.buffer, sPtr, sLen).set(salt);

                    const err = mod.argon2id_hash(
                        time, mem, threads,
                        pPtr, pLen,
                        sPtr, sLen,
                        outPtr, hashLen
                    );

                    mod.free(pPtr);
                    mod.free(sPtr);

                    if (err !== 0) {
                        mod.free(outPtr);
                        throw new Error('Argon2 error: ' + err);
                    }

                    const result = new Uint8Array(mod.memory.buffer, outPtr, hashLen).slice();
                    mod.free(outPtr);
                    return result;
                }
            };
        } catch (e) {
            console.warn('Argon2 WASM unavailable, falling back to PBKDF2:', e);
            return null;
        }
    })();

    return argon2Ready;
}

async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const pwBytes = enc.encode(password);

    const argon2 = await loadArgon2();

    if (argon2) {
        const hash = argon2.hash(pwBytes, salt, ARGON2_TIME, ARGON2_MEM, ARGON2_THREADS, KEY_LEN);
        const keyMaterial = await crypto.subtle.importKey(
            'raw', hash, 'HKDF', false, ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('AES-GCM') },
            keyMaterial,
            { name: 'AES-GCM', length: KEY_LEN * 8 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    const keyMaterial = await crypto.subtle.importKey(
        'raw', pwBytes, 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: KEY_LEN * 8 },
        false,
        ['encrypt', 'decrypt']
    );
}

function getKDFName() {
    return argon2Ready && argon2Ready.then ? 'Argon2id' : 'PBKDF2';
}

function writeUint32(view, offset, value) {
    view.setUint32(offset, value);
    return offset + 4;
}

function writeUint64(view, offset, value) {
    view.setUint32(offset, Math.floor(value / 0x100000000));
    view.setUint32(offset + 4, value >>> 0);
    return offset + 8;
}

function readUint32(view, offset) {
    return view.getUint32(offset);
}

function readUint64(view, offset) {
    const high = view.getUint32(offset);
    const low = view.getUint32(offset + 4);
    return high * 0x100000000 + low;
}

async function deriveKeyForVersion(password, salt, version) {
    if (version >= 4) {
        const argon2 = await loadArgon2();
        if (argon2) {
            const enc = new TextEncoder();
            const pwBytes = enc.encode(password);
            const hash = argon2.hash(pwBytes, salt, ARGON2_TIME, ARGON2_MEM, ARGON2_THREADS, KEY_LEN);
            const keyMaterial = await crypto.subtle.importKey(
                'raw', hash, 'HKDF', false, ['deriveKey']
            );
            return crypto.subtle.deriveKey(
                { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('AES-GCM') },
                keyMaterial,
                { name: 'AES-GCM', length: KEY_LEN * 8 },
                false,
                ['encrypt', 'decrypt']
            );
        }
    }
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: KEY_LEN * 8 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptData(filesArray, password, onProgress) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const key = await deriveKey(password, salt);

    const headerSize = MAGIC.length + 4 + 4 + SALT_LEN;
    const headerBuf = new ArrayBuffer(headerSize);
    const headerView = new DataView(headerBuf);
    const headerBytes = new Uint8Array(headerBuf);
    let hOff = 0;

    headerBytes.set(MAGIC, hOff); hOff += MAGIC.length;
    hOff = writeUint32(headerView, hOff, VERSION);
    hOff = writeUint32(headerView, hOff, filesArray.length);
    headerBytes.set(salt, hOff);

    const parts = [headerBytes];
    let totalSize = headerSize;
    const fileCount = filesArray.length;

    for (let fi = 0; fi < fileCount; fi++) {
        const { file, relativePath } = filesArray[fi];
        const pathBytes = enc.encode(relativePath);
        const fileSize = file.size;

        const metaSize = 4 + pathBytes.length + 8;
        const metaBuf = new ArrayBuffer(metaSize);
        const metaView = new DataView(metaBuf);
        const metaBytes = new Uint8Array(metaBuf);
        let mOff = 0;

        mOff = writeUint32(metaView, mOff, pathBytes.length);
        metaBytes.set(pathBytes, mOff); mOff += pathBytes.length;
        writeUint64(metaView, mOff, fileSize);

        parts.push(metaBytes);
        totalSize += metaSize;

        const totalChunks = fileSize === 0 ? 0 : Math.ceil(fileSize / CHUNK_SIZE);

        for (let ci = 0; ci < totalChunks; ci++) {
            const start = ci * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, fileSize);
            const chunkData = new Uint8Array(await file.slice(start, end).arrayBuffer());

            const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv, tagLength: 128 },
                key,
                chunkData
            );

            const packet = new Uint8Array(4 + IV_LEN + encrypted.byteLength);
            const packetView = new DataView(packet.buffer);
            writeUint32(packetView, 0, encrypted.byteLength);
            packet.set(iv, 4);
            packet.set(new Uint8Array(encrypted), 4 + IV_LEN);

            parts.push(packet);
            totalSize += packet.length;
        }

        if (onProgress) onProgress(Math.round(((fi + 1) / fileCount) * 100));
    }

    return {
        blob: new Blob(parts, { type: 'application/octet-stream' }),
        fileName: filesArray.length === 1
            ? filesArray[0].file.name + '.s'
            : 'encrypted.s'
    };
}

async function decryptData(fileObj, password, onProgress) {
    const fileSize = fileObj.size;
    const HEADER_SIZE = MAGIC.length + 4 + 4 + SALT_LEN;

    if (fileSize < HEADER_SIZE) {
        throw new Error('الملف ليس بامتداد .s صالح');
    }

    const headerBuf = await fileObj.slice(0, HEADER_SIZE).arrayBuffer();
    const headerView = new DataView(headerBuf);
    const headerBytes = new Uint8Array(headerBuf);
    let hOff = 0;

    const magic = headerBytes.slice(hOff, hOff + MAGIC.length); hOff += MAGIC.length;
    if (magic[0] !== 0x53 || magic[1] !== 0x45 || magic[2] !== 0x43 || magic[3] !== 0x53) {
        throw new Error('الملف ليس بامتداد .s صالح');
    }

    const version = readUint32(headerView, hOff); hOff += 4;
    const fileCount = readUint32(headerView, hOff); hOff += 4;
    const salt = headerBytes.slice(hOff, hOff + SALT_LEN); hOff += SALT_LEN;

    const checkBuf = await fileObj.slice(hOff, hOff + 4).arrayBuffer();
    const checkBytes = new Uint8Array(checkBuf);
    let readOffset = hOff;
    if (checkBytes[0] === 0 && checkBytes[1] === 0 && checkBytes[2] === 0 && checkBytes[3] === 0 && fileCount > 0) {
        readOffset += 4;
    }

    if (onProgress) onProgress(5);

    const key = await deriveKeyForVersion(password, salt, version);

    if (onProgress) onProgress(10);

    const decryptedFiles = [];

    for (let fi = 0; fi < fileCount; fi++) {
        const metaBuf = await fileObj.slice(readOffset, readOffset + 4).arrayBuffer();
        const pathLen = readUint32(new DataView(metaBuf), 0);
        readOffset += 4;

        const pathBuf = await fileObj.slice(readOffset, readOffset + pathLen).arrayBuffer();
        const relativePath = new TextDecoder().decode(pathBuf);
        readOffset += pathLen;

        const sizeBuf = await fileObj.slice(readOffset, readOffset + 8).arrayBuffer();
        const originalSize = readUint64(new DataView(sizeBuf), 0);
        readOffset += 8;

        const chunks = [];
        let decryptedSize = 0;

        while (decryptedSize < originalSize) {
            const lenBuf = await fileObj.slice(readOffset, readOffset + 4).arrayBuffer();
            const cipherLen = readUint32(new DataView(lenBuf), 0);
            readOffset += 4;

            const ivBuf = await fileObj.slice(readOffset, readOffset + IV_LEN).arrayBuffer();
            const iv = new Uint8Array(ivBuf);
            readOffset += IV_LEN;

            const cipherBuf = await fileObj.slice(readOffset, readOffset + cipherLen).arrayBuffer();
            readOffset += cipherLen;

            try {
                const decrypted = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv, tagLength: 128 },
                    key,
                    cipherBuf
                );
                chunks.push(new Uint8Array(decrypted));
                decryptedSize += decrypted.byteLength;
            } catch {
                throw new Error('خطأ في فك التشفير: كلمة المرور خاطئة أو ملف تالف');
            }
        }

        decryptedFiles.push({
            path: relativePath,
            blob: new Blob(chunks)
        });

        if (onProgress) onProgress(Math.round(10 + ((fi + 1) / fileCount) * 90));
    }

    if (onProgress) onProgress(100);

    return { files: decryptedFiles };
}
