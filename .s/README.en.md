<div align="center">

# .s — File Encryptor

**Encrypt and decrypt files directly in your browser**

AES-256-GCM | PBKDF2 | No Servers | Complete Privacy

**[Live Demo](https://snono-dev.github.io/s-format/)** | **[Source on GitHub](https://github.com/Snono-Dev/s-format)**

<br>

![English](https://img.shields.io/badge/Language-English-blue) [![العربية](https://img.shields.io/badge/اللغة-العربية-purple)](README.md)

</div>

---

## What is .s?

A free file encryption tool that runs entirely in your browser. All operations happen locally on your device — no data is ever sent to any server.

- Encrypt any file or folder
- Encrypted file extension: `.s`
- Decryptable on any device that supports the site

## Features

| Feature | Details |
|---------|---------|
| Encryption | AES-256-GCM (Military-grade) |
| Key Derivation | Argon2id with PBKDF2 fallback |
| Salt | 32 bytes random per encryption |
| IV | 12 bytes random per chunk |
| Folders | Each file encrypted separately, no ZIP compression |
| Languages | Arabic + English |
| Server | None — works entirely in the browser |

## How to Use

### Encrypt
1. Open the site in your browser
2. Drag your file or click to select
3. Enter a strong password
4. Click "Encrypt File"
5. Download the file with `.s` extension

### Decrypt
1. Switch to the "Decrypt" tab
2. Drag the encrypted file or select it
3. Enter the password
4. Click "Decrypt File"
5. Download the original file

## Installation

```bash
git clone https://github.com/Snono-Dev/s-format.git
cd s-format
# Open index.html in your browser
# Or deploy with GitHub Pages
```

## Project Structure

```
.s/
├── index.html          # Main page
├── css/
│   └── style.css       # Styles
├── js/
│   ├── i18n.js         # Language support
│   ├── crypto.js       # Encryption logic
│   └── app.js          # UI logic
└── README.en.md
```

## How Encryption Works

```
Original File/Folder
    ↓
Derive key from password (Argon2id + Salt)
    ↓
Split file into 1MB chunks
    ↓
Encrypt each chunk with AES-256-GCM + random IV
    ↓
Output file format (.s):
┌─────────┬─────────┬───────────┬─────────┬─────┬──────────────────┐
│  MAGIC  │ VERSION │ FILE_COUNT│  SALT   │ IV  │  ENCRYPTED DATA  │
│ 4 byte  │ 4 byte  │  4 byte   │ 32 byte │12 B │   (per file)     │
└─────────┴─────────┴───────────┴─────────┴─────┴──────────────────┘

Note: Files are stored individually inside the container
without ZIP compression — ZIP is only used during download
as a workaround since browsers don't support folder downloads.
```

## Security

- No server — everything happens in the browser
- AES-256-GCM with authenticated encryption
- Argon2id for dictionary and quantum attack resistance
- Random salt and IV unique per encryption
- No passwords are ever stored

## License

Open source — use it freely.

---

<div align="center">

Made with love in Mesopotamia

</div>
