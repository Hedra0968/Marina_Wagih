import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// توليد كود دخول سري عشوائي
const generateAccessCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// تسجيل حساب جديد (ينزل بحالة معلق pending)
export async function register(email, password, name, phone, stage, subject, role) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const accessCode = generateAccessCode();
        
        const userData = {
            uid: userCredential.user.uid,
            name, email, phone, role, accessCode,
            createdAt: new Date(),
            status: 'pending' // ⚠️ الحساب معلق افتراضياً
        };

        if (role === 'student') {
            userData.stage = stage;
            userData.subject = subject;
        } else if (role === 'secretary') {
            userData.canApproveAttendance = false;
        }

        await setDoc(doc(db, "users", userCredential.user.uid), userData);
        
        await Swal.fire({
            title: 'تم تسجيل طلبك بنجاح!',
            html: `كودك السري هو: <b style="color:red; font-size:24px;">${accessCode}</b><br><br>حسابك الآن <b>قيد المراجعة</b>. تواصل مع المديرة لتفعيل الحساب قبل محاولة الدخول.`,
            icon: 'info',
            confirmButtonText: 'فهمت'
        });
        
        await signOut(auth); // طرده فوراً حتى لا يدخل قبل التفعيل
        window.location.href = 'index.html';
        
    } catch (error) {
        Swal.fire('خطأ', 'حدث خطأ في التسجيل: ' + error.message, 'error');
    }
}

// تسجيل الدخول مع فحص الحالة
export async function login(email, password, providedCode, selectedRole) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // 1. فحص التفعيل (المديرة مستثناة من الفحص لتتمكن من الدخول)
            if (data.status === 'pending' && data.role !== 'admin') {
                await signOut(auth);
                Swal.fire('الحساب غير نشط', 'عذراً، لم يتم تفعيل حسابك من قبل المديرة بعد.', 'warning');
                return;
            }

            // 2. فحص الكود السري
            if (data.accessCode !== providedCode) {
                await signOut(auth);
                Swal.fire('خطأ', 'كود الدخول السري غير صحيح!', 'error');
                return;
            }

            // 3. فحص الرتبة (الباب الصحيح)
            if (data.role !== selectedRole) {
                await signOut(auth);
                Swal.fire('دخول مرفوض', `هذا الحساب غير مسجل كـ ${selectedRole}`, 'warning');
                return;
            }

            Swal.fire({ title: 'نجاح', text: 'جاري تحويلك للوحة التحكم...', icon: 'success', timer: 1000, showConfirmButton: false });
            setTimeout(() => redirectByRole(data.role), 1000);
        }
    } catch (error) {
        Swal.fire('خطأ', 'بيانات الدخول غير صحيحة', 'error');
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

onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    if (!user && !path.includes('index.html')) {
        window.location.href = 'index.html';
    }
});
