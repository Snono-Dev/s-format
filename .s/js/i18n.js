const translations = {
    ar: {
        title: "File Encryptor",
        subtitle: "تشفير وفك تشفير الملفات بأمان تام باستخدام AES-256-GCM",
        tab_encrypt: "تشفير",
        tab_decrypt: "فك التشفير",
        drop_encrypt_h: "اسحب الملفات أو المجلدات هنا",
        drop_encrypt_p: "أو انقر لاختيار ملف / مجلد — جميع الأنواع مدعومة",
        select_files: "اختيار ملفات",
        select_folder: "اختيار مجلد",
        drop_decrypt_h: "اسحب الملف المشفر هنا",
        drop_decrypt_p: "أو انقر لاختيار ملف بامتداد .s",
        password: "كلمة المرور",
        password_placeholder: "أدخل كلمة مرور قوية",
        password_confirm: "تأكيد كلمة المرور",
        password_confirm_placeholder: "أعد إدخال كلمة المرور",
        btn_encrypt: "تشفير الملف",
        btn_decrypt: "فك التشفير",
        progress_encrypt: "جاري التشفير...",
        progress_decrypt: "جاري فك التشفير...",
        result_encrypt_h: "تم التشفير بنجاح!",
        result_encrypt_p: "الملف جاهز للتحميل بامتداد .s",
        result_decrypt_h: "تم فك التشفير بنجاح!",
        result_decrypt_p: "الملف جاهز للتحميل",
        feat1: "التشفير العسكري الأقوى",
        feat2_h: "كل شيء في المتصفح",
        feat2_p: "لا يتم إرسال أي بيانات",
        feat3_h: "جميع الملفات",
        feat3_p: "ملفات ومجلدات بلا حدود",
        crypto_title: "تفاصيل التشفير",
        crypto_algo: "الخوارزمية:",
        crypto_key: "اشتقاق المفتاح:",
        crypto_iters: "الذاكرة:",
        crypto_salt: "الملح:",
        crypto_chunk: "حجم الجزء:",
        crypto_version: "الإصدار:",
        crypto_quantum: "مقاومة كمومية:",
        footer: 'صُنع بـ <span>&#10084;</span> في بلاد الرافدين',
        strength_weak: "ضعيفة",
        strength_medium: "متوسطة",
        strength_strong: "قوية",
        err_encrypt: "خطأ في التشفير:",
        err_decrypt: "خطأ في فك التشفير: تأكد من كلمة المرور والملف",
        file_ready: "الملف: ",
        file_ready_suffix: " — جاهز للتحميل"
    },
    en: {
        title: "File Encryptor",
        subtitle: "Encrypt and decrypt files securely with AES-256-GCM",
        tab_encrypt: "Encrypt",
        tab_decrypt: "Decrypt",
        drop_encrypt_h: "Drag files or folders here",
        drop_encrypt_p: "Or click to select — all types supported",
        select_files: "Select Files",
        select_folder: "Select Folder",
        drop_decrypt_h: "Drag encrypted file here",
        drop_decrypt_p: "Or click to select a .s file",
        password: "Password",
        password_placeholder: "Enter a strong password",
        password_confirm: "Confirm Password",
        password_confirm_placeholder: "Re-enter password",
        btn_encrypt: "Encrypt File",
        btn_decrypt: "Decrypt File",
        progress_encrypt: "Encrypting...",
        progress_decrypt: "Decrypting...",
        result_encrypt_h: "Encrypted Successfully!",
        result_encrypt_p: "File is ready to download with .s extension",
        result_decrypt_h: "Decrypted Successfully!",
        result_decrypt_p: "File is ready to download",
        feat1: "Military-Grade Encryption",
        feat2_h: "Everything in the Browser",
        feat2_p: "No data is ever sent",
        feat3_h: "All File Types",
        feat3_p: "Files and folders, no limits",
        crypto_title: "Encryption Details",
        crypto_algo: "Algorithm:",
        crypto_key: "Key Derivation:",
        crypto_iters: "Memory:",
        crypto_salt: "Salt:",
        crypto_chunk: "Chunk Size:",
        crypto_version: "Version:",
        crypto_quantum: "Quantum:",
        footer: 'Made with <span>&#10084;</span> in Mesopotamia',
        strength_weak: "Weak",
        strength_medium: "Medium",
        strength_strong: "Strong",
        err_encrypt: "Encryption error:",
        err_decrypt: "Decryption error: check your password and file",
        file_ready: "File: ",
        file_ready_suffix: " — Ready to download"
    }
};

let currentLang = 'ar';

function setLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.lang-btn[onclick="setLang('${lang}')"]`).classList.add('active');

    const t = translations[lang];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerHTML = t[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });

    const strengthText = document.getElementById('strength-text');
    const bar = document.getElementById('strength-bar');
    if (bar.classList.contains('strength-weak')) strengthText.textContent = t.strength_weak;
    else if (bar.classList.contains('strength-medium')) strengthText.textContent = t.strength_medium;
    else if (bar.classList.contains('strength-strong')) strengthText.textContent = t.strength_strong;
}

function t(key) {
    return translations[currentLang][key] || key;
}
