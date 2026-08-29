let encryptFilesArray = null;
let decryptFileObj = null;

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    if (tab === 'encrypt') {
        document.querySelectorAll('.tab')[0].classList.add('active');
        document.getElementById('encrypt-panel').classList.add('active');
    } else {
        document.querySelectorAll('.tab')[1].classList.add('active');
        document.getElementById('decrypt-panel').classList.add('active');
    }
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '&#128064;';
    } else {
        input.type = 'password';
        btn.innerHTML = '&#128065;';
    }
}

function checkStrength(password) {
    const bar = document.getElementById('strength-bar');
    const text = document.getElementById('strength-text');
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    bar.className = 'password-strength-bar';
    if (password.length === 0) {
        bar.style.width = '0%';
        text.textContent = '';
        text.style.color = '';
        return;
    }

    if (strength <= 2) {
        bar.classList.add('strength-weak');
        text.textContent = t('strength_weak');
        text.style.color = '#ef4444';
    } else if (strength <= 3) {
        bar.classList.add('strength-medium');
        text.textContent = t('strength_medium');
        text.style.color = '#f59e0b';
    } else {
        bar.classList.add('strength-strong');
        text.textContent = t('strength_strong');
        text.style.color = '#10b981';
    }

    updateEncryptBtn();
}

function updateEncryptBtn() {
    const btn = document.getElementById('encrypt-btn');
    const password = document.getElementById('encrypt-password').value;
    const confirm = document.getElementById('encrypt-password-confirm').value;
    btn.disabled = !(encryptFilesArray && encryptFilesArray.length > 0 && password && password === confirm && password.length >= 4);
}

function updateDecryptBtn() {
    const btn = document.getElementById('decrypt-btn');
    const password = document.getElementById('decrypt-password').value;
    btn.disabled = !(decryptFileObj && password.length > 0);
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function clearEncryptFile() {
    encryptFilesArray = null;
    document.getElementById('encrypt-file-info').classList.remove('active');
    document.getElementById('encrypt-file-input').value = '';
    document.getElementById('encrypt-folder-input').value = '';
    updateEncryptBtn();
}

function clearDecryptFile() {
    decryptFileObj = null;
    document.getElementById('decrypt-file-info').classList.remove('active');
    document.getElementById('decrypt-file-input').value = '';
    updateDecryptBtn();
}

function showEncryptFileInfo(name, size) {
    document.getElementById('encrypt-file-name').textContent = name;
    document.getElementById('encrypt-file-size').textContent = formatSize(size);
    document.getElementById('encrypt-file-info').classList.add('active');
}

function showDecryptFileInfo(name, size) {
    document.getElementById('decrypt-file-name').textContent = name;
    document.getElementById('decrypt-file-size').textContent = formatSize(size);
    document.getElementById('decrypt-file-info').classList.add('active');
}

function updateProgress(type, percent) {
    const container = document.getElementById(type + '-progress');
    const fill = document.getElementById(type + '-progress-fill');
    const text = document.getElementById(type + '-progress-percent');
    container.classList.add('active');
    fill.style.width = Math.round(percent) + '%';
    text.textContent = Math.round(percent) + '%';
}

function resetProgress(type) {
    const container = document.getElementById(type + '-progress');
    container.classList.remove('active');
}

async function handleEncryptFiles(fileList) {
    const isFolder = fileList.length > 0 && fileList[0].webkitRelativePath;

    if (fileList.length === 1 && !isFolder) {
        const file = fileList[0];
        encryptFilesArray = [{ file, relativePath: file.name }];
        showEncryptFileInfo(file.name, file.size);
    } else {
        const filesArr = [];
        let totalSize = 0;
        for (const file of fileList) {
            const path = file.webkitRelativePath || file.name;
            filesArr.push({ file, relativePath: path });
            totalSize += file.size;
        }
        encryptFilesArray = filesArr;
        showEncryptFileInfo(fileList.length + ' files', totalSize);
    }
    updateEncryptBtn();
}

async function readEntryAsFile(entry, path) {
    return new Promise((resolve, reject) => {
        if (entry.isFile) {
            entry.file(file => {
                file._relativePath = path + file.name;
                resolve({ file, relativePath: path + file.name });
            }, reject);
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const allEntries = [];

            function readBatch() {
                reader.readEntries(async (entries) => {
                    if (entries.length === 0) {
                        const results = await Promise.all(
                            allEntries.map(e => readEntryAsFile(e, path + entry.name + '/'))
                        );
                        resolve(results.flat());
                    } else {
                        allEntries.push(...entries);
                        readBatch();
                    }
                }, reject);
            }
            readBatch();
        } else {
            resolve([]);
        }
    });
}

async function handleDropItems(items) {
    const files = [];
    const entries = [];

    for (const item of items) {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) entries.push(entry);
    }

    if (entries.length === 0) return;

    for (const entry of entries) {
        const result = await readEntryAsFile(entry, '');
        if (Array.isArray(result)) {
            files.push(...result);
        } else {
            files.push(result);
        }
    }

    if (files.length > 0) {
        const fileList = files.map(f => f.file);
        handleEncryptFiles(fileList);
        encryptFilesArray = files;
    }
}

async function encryptFile() {
    const btn = document.getElementById('encrypt-btn');
    const password = document.getElementById('encrypt-password').value;

    if (!encryptFilesArray || encryptFilesArray.length === 0 || !password) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> ' + t('progress_encrypt');

    try {
        const result = await encryptData(encryptFilesArray, password, (p) => updateProgress('encrypt', p));

        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName;
        a.click();
        URL.revokeObjectURL(url);

        document.getElementById('encrypt-result').classList.add('active');
        resetProgress('encrypt');

    } catch (err) {
        alert(t('err_encrypt') + ' ' + err.message);
    }

    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">&#128274;</span> ' + t('btn_encrypt');
}

async function decryptFile() {
    const btn = document.getElementById('decrypt-btn');
    const password = document.getElementById('decrypt-password').value;

    if (!decryptFileObj || !password) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> ' + t('progress_decrypt');

    try {
        const result = await decryptData(decryptFileObj, password, (p) => updateProgress('decrypt', p));

        if (result.files.length === 1) {
            const file = result.files[0];
            const url = URL.createObjectURL(file.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.path;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            const zip = new JSZip();
            for (const f of result.files) {
                zip.file(f.path, f.blob);
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'decrypted.zip';
            a.click();
            URL.revokeObjectURL(url);
        }

        const countText = result.files.length === 1
            ? result.files[0].path
            : result.files.length + ' files';
        document.getElementById('decrypt-result').querySelector('p').textContent =
            t('file_ready') + countText + t('file_ready_suffix');
        document.getElementById('decrypt-result').classList.add('active');
        resetProgress('decrypt');

    } catch (err) {
        alert(t('err_decrypt'));
    }

    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">&#128275;</span> ' + t('btn_decrypt');
}

document.addEventListener('DOMContentLoaded', function () {
    // Encrypt drag & drop
    const encryptDrop = document.getElementById('encrypt-drop-zone');
    encryptDrop.addEventListener('dragover', e => { e.preventDefault(); encryptDrop.classList.add('drag-over'); });
    encryptDrop.addEventListener('dragleave', () => encryptDrop.classList.remove('drag-over'));
    encryptDrop.addEventListener('drop', e => {
        e.preventDefault();
        encryptDrop.classList.remove('drag-over');
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            handleDropItems(e.dataTransfer.items);
        } else if (e.dataTransfer.files.length > 0) {
            handleEncryptFiles(e.dataTransfer.files);
        }
    });

    // Decrypt drag & drop
    const decryptDrop = document.getElementById('decrypt-drop-zone');
    decryptDrop.addEventListener('dragover', e => { e.preventDefault(); decryptDrop.classList.add('drag-over'); });
    decryptDrop.addEventListener('dragleave', () => decryptDrop.classList.remove('drag-over'));
    decryptDrop.addEventListener('drop', e => {
        e.preventDefault();
        decryptDrop.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            decryptFileObj = e.dataTransfer.files[0];
            showDecryptFileInfo(decryptFileObj.name, decryptFileObj.size);
            updateDecryptBtn();
        }
    });

    // File inputs
    document.getElementById('encrypt-file-input').addEventListener('change', function (e) {
        if (e.target.files.length > 0) {
            handleEncryptFiles(e.target.files);
        }
    });

    document.getElementById('encrypt-folder-input').addEventListener('change', function (e) {
        if (e.target.files.length > 0) {
            const filesArr = [];
            for (const file of e.target.files) {
                filesArr.push({ file, relativePath: file.webkitRelativePath || file.name });
            }
            encryptFilesArray = filesArr;
            const totalSize = filesArr.reduce((s, f) => s + f.file.size, 0);
            showEncryptFileInfo(e.target.files.length + ' files', totalSize);
            updateEncryptBtn();
        }
    });

    document.getElementById('decrypt-file-input').addEventListener('change', function (e) {
        if (e.target.files.length > 0) {
            decryptFileObj = e.target.files[0];
            showDecryptFileInfo(decryptFileObj.name, decryptFileObj.size);
            updateDecryptBtn();
        }
    });

    // Password listeners
    document.getElementById('encrypt-password').addEventListener('input', updateEncryptBtn);
    document.getElementById('encrypt-password-confirm').addEventListener('input', updateEncryptBtn);
    document.getElementById('decrypt-password').addEventListener('input', updateDecryptBtn);
});
