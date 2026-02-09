/* JS File: auth.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Core: Firebase Authentication & Security Logic
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

// --- 1. توليد كود دخول سري (8 رموز فريدة) ---
const generateAccessCode = () => {
    // استبعاد الحروف المتشابهة (I, L, 1, O, 0) لضمان سهولة القراءة للطالب
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; 
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// --- 2. وظيفة تسجيل حساب جديد (Register) ---
export async function register(email, password, name, photoURL, stage, subject, role, phone) {
    try {
        // إنشاء الحساب في Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const accessCode = generateAccessCode();
        
        const userData = {
            uid: userCredential.user.uid,
            name: name,
            email: email.toLowerCase(),
            phone: phone || "غير مسجل",
            role: role,
            photoURL: photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            accessCode: accessCode,
            points: 0, // رصيد نقاط التميز الابتدائي
            createdAt: serverTimestamp(),
            status: 'pending' // الحساب يظل معلقاً حتى تفعله المديرة
        };

        // تخصيص البيانات بناءً على الرتبة
        if (role === 'student') {
            userData.stage = stage;
            userData.subject = subject;
        } else if (role === 'secretary') {
            userData.canApproveAttendance = false; // صلاحية تمنح يدوياً
        }

        // حفظ ملف المستخدم في Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), userData);
        
        // تسجيل الخروج فوراً (لأن الحساب pending ولا يجب أن يدخل المنصة الآن)
        await signOut(auth);

        return { success: true, userData };
        
    } catch (error) {
        console.error("Registration Error:", error);
        throw error; // سيتم معالجته في app.js لإظهار التنبيه المناسب
    }
}

// --- 3. وظيفة تسجيل الدخول (Login) مع فحص 3 مستويات من الأمان ---
export async function login(email, password, providedCode, selectedRole) {
    try {
        // التحقق الأولي من البريد وكلمة المرور
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();

            // المستوى 1: فحص "البوابة الصحيحة"
            if (data.role !== selectedRole) {
                await signOut(auth);
                Swal.fire('دخول مرفوض', `هذا الحساب مخصص لـ (${data.role === 'student' ? 'الطلاب' : 'الإدارة'}) فقط.`, 'warning');
                return;
            }

            // المستوى 2: فحص "كود الأمان الشخصي"
            if (data.accessCode !== providedCode.trim().toUpperCase()) {
                await signOut(auth);
                Swal.fire('كود خاطئ', 'كود الدخول السري غير صحيح، يرجى مراجعة الكارت الخاص بك.', 'error');
                return;
            }

            // المستوى 3: فحص "حالة التفعيل" (المديرة مارينا مستثناة)
            if (data.status === 'pending' && data.role !== 'admin') {
                await signOut(auth);
                Swal.fire({
                    title: 'الحساب بانتظار التفعيل',
                    text: 'أهلاً بك! حسابك مسجل بنجاح، يرجى التواصل مع الدكتورة مارينا أو السكرتارية لتفعيل الحساب.',
                    icon: 'info'
                });
                return;
            }

            // المستوى 4: فحص الحسابات المحذوفة
            if (data.status === 'deleted') {
                await signOut(auth);
                Swal.fire('حساب غير صالح', 'تم إلغاء صلاحية الوصول لهذا الحساب.', 'error');
                return;
            }

            // نجاح كافة الفحوصات
            Swal.fire({ 
                title: `مرحباً ${data.name.split(' ')[0]}`, 
                text: 'جاري تحضير بياناتك...', 
                icon: 'success', 
                timer: 1500, 
                showConfirmButton: false 
            });
            
            setTimeout(() => redirectByRole(data.role), 1500);
        }
    } catch (error) {
        let errorMsg = "تأكد من البريد وكلمة المرور";
        if (error.code === 'auth/user-not-found') errorMsg = "هذا الحساب غير موجود";
        if (error.code === 'auth/wrong-password') errorMsg = "كلمة المرور غير صحيحة";
        
        Swal.fire('فشل الدخول', errorMsg, 'error');
    }
}

// --- 4. وظائف الملاحة والحماية ---
export function logout() {
    signOut(auth).then(() => {
        window.location.replace('index.html'); // استخدام replace لمنع الرجوع للخلف
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

// --- 5. درع الحماية (Session Guard) ---
onAuthStateChanged(auth, async (user) => {
    const path = window.location.pathname;
    const isPublicPage = path.includes('index.html') || path === '/' || path === '';
    
    if (!user && !isPublicPage) {
        // إذا حاول المستخدم فتح صفحة داخلية بدون تسجيل دخول
        window.location.replace('index.html');
    } else if (user && isPublicPage) {
        // إذا كان مسجل دخول وحاول الرجوع لصفحة تسجيل الدخول، نوجهه للوحته مباشرة
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) redirectByRole(userDoc.data().role);
    }
});

/* PROTECTION: BLOCK DEV TOOLS CONSOLE MESSAGES */
console.log("%cتنبيه!", "color: red; font-size: 30px; font-weight: bold;");
console.log("%cهذه المنطقة مخصصة للمطورين فقط. محاولة العبث هنا تعرض حسابك للحظر.", "font-size: 16px;");
