/* JS File: auth.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Core: Firebase Authentication & Security Logic (Integrated Version)
*/

import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// --- 1. توليد كود دخول سري معقد (8 رموز سهلة القراءة) ---
const generateAccessCode = () => {
    // استبعاد الحروف المتشابهة (I, L, 1, O, 0) لضمان دقة إدخال الطالب للكود
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; 
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// --- 2. تسجيل حساب جديد مع دعم الصورة والنقاط والهاتف ---
export async function register(email, password, name, photoURL, stage, subject, role, phone) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const accessCode = generateAccessCode();
        
        const userData = {
            uid: userCredential.user.uid,
            name: name,
            email: email.toLowerCase().trim(),
            phone: phone || "غير مسجل",
            role: role,
            photoURL: photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            accessCode: accessCode,
            points: 0, // رصيد التميز الابتدائي للطلاب
            createdAt: serverTimestamp(),
            status: 'pending' // الحساب معلق افتراضياً حتى تفعيل الإدارة
        };

        // تخصيص البيانات الإضافية حسب الدور
        if (role === 'student') {
            userData.stage = stage;
            userData.subject = subject;
        } else if (role === 'secretary') {
            userData.canApproveAttendance = false;
        }

        // حفظ البيانات في Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), userData);
        
        // تسجيل الخروج فوراً لضمان عدم الدخول قبل التفعيل
        await signOut(auth);

        return { success: true, userData };
        
    } catch (error) {
        console.error("Auth Error:", error);
        throw error; // يتم معالجته في app.js لإظهار رسالة الخطأ المناسبة
    }
}

// --- 3. تسجيل الدخول مع فحص الأمان الرباعي والحالة ---
export async function login(email, password, providedCode, selectedRole) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // المستوى 1: فحص البوابة (الدور)
            if (data.role !== selectedRole) {
                await signOut(auth);
                Swal.fire('دخول مرفوض', `هذا الحساب مسجل كـ (${data.role === 'student' ? 'طالب' : 'إدارة'})، يرجى الدخول من البوابة الصحيحة.`, 'warning');
                return;
            }

            // المستوى 2: فحص الحسابات المحذوفة
            if (data.status === 'deleted') {
                await signOut(auth);
                Swal.fire('حساب غير صالح', 'عذراً، هذا الحساب لم يعد متاحاً في النظام.', 'error');
                return;
            }

            // المستوى 3: فحص التفعيل (مارينا مستثناة دائماً)
            if (data.status === 'pending' && data.role !== 'admin') {
                await signOut(auth);
                Swal.fire('الحساب بانتظار التفعيل', 'تم استلام بياناتك، يرجى التواصل مع الإدارة لتفعيل الحساب.', 'info');
                return;
            }

            // المستوى 4: فحص كود الأمان الشخصي
            if (data.accessCode !== providedCode.trim().toUpperCase()) {
                await signOut(auth);
                Swal.fire('كود خاطئ', 'كود الدخول السري غير صحيح، يرجى التأكد من الكود في الكارت الخاص بك.', 'error');
                return;
            }

            // نجاح الدخول
            Swal.fire({ 
                title: `مرحباً ${data.name.split(' ')[0]}`, 
                text: 'جاري فتح لوحة التحكم الخاصة بك...', 
                icon: 'success', 
                timer: 1500, 
                showConfirmButton: false 
            });
            
            setTimeout(() => redirectByRole(data.role), 1500);
        }
    } catch (error) {
        let errorMsg = "تأكد من البريد وكلمة المرور";
        if (error.code === 'auth/user-not-found') errorMsg = "هذا البريد غير مسجل لدينا!";
        if (error.code === 'auth/wrong-password') errorMsg = "كلمة المرور غير صحيحة!";
        Swal.fire('فشل الدخول', errorMsg, 'error');
    }
}

// --- 4. وظائف الخروج والملاحة ---
export function logout() {
    signOut(auth).then(() => {
        window.location.replace('index.html'); // استخدام replace لمنع الطالب من الرجوع للخلف
    });
}

export function redirectByRole(role) {
    const pages = {
        'admin': 'admin.html',
        'secretary': 'secretary.html',
        'student': 'student.html'
    };
    window.location.href = pages[role] || 'index.html';
}

// --- 5. درع الحماية ومراقبة الجلسة (Session Guard) ---
onAuthStateChanged(auth, async (user) => {
    const path = window.location.pathname;
    const isPublicPage = path.includes('index.html') || path === '/' || path === '';
    
    if (!user && !isPublicPage) {
        // حماية الصفحات الداخلية من الدخول غير المصرح
        window.location.replace('index.html');
    } else if (user && isPublicPage) {
        // إذا كان مسجل دخول وحاول فتح صفحة البداية، وجهه فوراً للوحة تحكمه
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) redirectByRole(userDoc.data().role);
    }
});

/* PROTECTION: CONSOLE WARNING MESSAGE */
console.log("%cتنبيه أمني!", "color: red; font-size: 30px; font-weight: bold;");
console.log("%cهذا الجزء مخصص للمطورين فقط. محاولة العبث بالأكواد تعرض حسابك للحظر النهائي.", "font-size: 16px; color: black;");
            role: role,
            photoURL: photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            accessCode: accessCode,
            points: 0,
            createdAt: serverTimestamp(),
            status: 'pending' 
        };

        if (role === 'student') {
            userData.stage = stage;
            userData.subject = subject;
        } else if (role === 'secretary') {
            userData.canApproveAttendance = false;
        }

        await setDoc(doc(db, "users", userCredential.user.uid), userData);
        
        // تسجيل الخروج لانتظار التفعيل
        await signOut(auth);

        return { success: true, userData };
        
    } catch (error) {
        console.error("Registration Error:", error);
        throw error;
    }
}

// --- 3. وظيفة تسجيل الدخول (Login) مع فحص صارم للمكان والكود ---
export async function login(email, password, providedCode, selectedRole) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();

            // فحص 1: هل المكان صحيح؟ (الميزة المطلوبة)
            if (data.role !== selectedRole) {
                await signOut(auth);
                return { 
                    success: false, 
                    errorType: 'wrong-role', 
                    message: `هذا الحساب مخصص لوحة (${data.role === 'student' ? 'الطلاب' : 'الإدارة'}) وليس هنا.` 
                };
            }

            // فحص 2: هل كود الأمان مطابق؟
            if (data.accessCode !== providedCode.trim().toUpperCase()) {
                await signOut(auth);
                return { 
                    success: false, 
                    errorType: 'wrong-code', 
                    message: 'كود الدخول السري غير صحيح.' 
                };
            }

            // فحص 3: حالة التفعيل
            if (data.status === 'pending' && data.role !== 'admin') {
                await signOut(auth);
                return { 
                    success: false, 
                    message: 'حسابك بانتظار تفعيل الدكتورة مارينا.' 
                };
            }

            // فحص 4: الحسابات المحذوفة
            if (data.status === 'deleted') {
                await signOut(auth);
                return { success: false, message: 'هذا الحساب لم يعد فعالاً.' };
            }

            // إذا وصل هنا، الدخول ناجح
            Swal.fire({ 
                title: `أهلاً ${data.name.split(' ')[0]}`, 
                icon: 'success', 
                timer: 1000, 
                showConfirmButton: false 
            });
            
            setTimeout(() => redirectByRole(data.role), 1000);
            return { success: true };
        }
    } catch (error) {
        let errorMsg = "خطأ في البريد أو كلمة المرور";
        if (error.code === 'auth/user-not-found') errorMsg = "الحساب غير موجود";
        if (error.code === 'auth/wrong-password') errorMsg = "كلمة المرور خاطئة";
        return { success: false, message: errorMsg };
    }
}

// --- 4. وظائف الملاحة والحماية ---
export function logout() {
    signOut(auth).then(() => {
        window.location.replace('index.html');
    });
}

export function redirectByRole(role) {
    const pages = {
        'admin': 'admin.html',
        'secretary': 'secretary.html',
        'student': 'student.html'
    };
    window.location.href = pages[role] || 'index.html';
}

// --- 5. درع الحماية الذكي (Session Guard) ---
onAuthStateChanged(auth, async (user) => {
    const path = window.location.pathname;
    const isPublicPage = path.includes('index.html') || path === '/' || path === '';
    
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // حماية إضافية: لو طالب حاول يفتح رابط admin.html يدوياً وهو مسجل دخول
            if (!isPublicPage && !path.includes(userData.role + '.html')) {
                redirectByRole(userData.role);
            }
            
            if (isPublicPage) redirectByRole(userData.role);
        }
    } else {
        if (!isPublicPage) window.location.replace('index.html');
    }
});

/* PROTECTION SHIELD */
console.log("%c© 2026 Marina Wagih & Hadra Victor", "color: #0d6efd; font-weight: bold; font-size: 12px;");
