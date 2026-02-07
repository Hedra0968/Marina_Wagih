import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// دالة لتوليد كود دخول سري عشوائي لكل مستخدم
const generateAccessCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// تسجيل حساب جديد مع توليد كود سري
export async function register(email, password, name, phone, stage, subject, role) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const accessCode = generateAccessCode();
        
        const userData = {
            uid: userCredential.user.uid,
            name: name,
            email: email,
            phone: phone,
            role: role,
            accessCode: accessCode,
            createdAt: new Date(),
            status: 'active'
        };

        if (role === 'student') {
            userData.stage = stage;
            userData.subject = subject;
        } else if (role === 'secretary') {
            userData.canApproveAttendance = false; // المديرة فقط من تفعلها
        }

        await setDoc(doc(db, "users", userCredential.user.uid), userData);
        
        await Swal.fire({
            title: 'تم إنشاء الحساب بنجاح!',
            html: `كود الدخول السري الخاص بك هو: <br><b style="color:var(--danger); font-size:28px;">${accessCode}</b><br>احفظ هذا الكود، لن تستطيع الدخول بدونه!`,
            icon: 'success',
            confirmButtonText: 'حفظت الكود، ادخل الآن'
        });
        
        redirectByRole(role);
        
    } catch (error) {
        let msg = "حدث خطأ في التسجيل";
        if (error.code === 'auth/email-already-in-use') msg = "هذا البريد مسجل بالفعل";
        Swal.fire('خطأ', msg, 'error');
    }
}

// تسجيل الدخول بالبريد والباسورد والكود السري
export async function login(email, password, providedCode) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.accessCode === providedCode) {
                Swal.fire({
                    title: 'مرحباً بك',
                    text: `تم تسجيل الدخول كـ ${data.role}`,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setTimeout(() => redirectByRole(data.role), 1500);
            } else {
                await signOut(auth);
                Swal.fire('خطأ في التحقق', 'كود الدخول السري غير صحيح!', 'error');
            }
        }
    } catch (error) {
        Swal.fire('خطأ', 'بيانات الدخول (الإيميل أو الباسورد) غير صحيحة', 'error');
    }
}

export function logout() {
    signOut(auth).then(() => window.location.href = 'index.html');
}

export function redirectByRole(role) {
    if (role === 'admin') window.location.href = 'admin.html';
    else if (role === 'secretary') window.location.href = 'secretary.html';
    else if (role === 'student') window.location.href = 'student.html';
    else window.location.href = 'index.html';
}

// حماية الصفحات والتحقق من حالة الدخول
onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    if (!user && !path.includes('index.html')) {
        window.location.href = 'index.html';
    }
});