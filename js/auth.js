import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

const generateAccessCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export async function register(email, password, name, phone, stage, subject, role) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const accessCode = generateAccessCode();
        
        const userData = {
            uid: userCredential.user.uid,
            name, email, phone, role, accessCode,
            createdAt: new Date(),
            status: 'active'
        };

        if (role === 'student') {
            userData.stage = stage;
            userData.subject = subject;
        } else if (role === 'secretary') {
            userData.canApproveAttendance = false;
        }

        await setDoc(doc(db, "users", userCredential.user.uid), userData);
        
        await Swal.fire({
            title: 'تم إنشاء الحساب!',
            html: `كود الدخول السري الخاص بك هو: <br><b style="color:red; font-size:28px;">${accessCode}</b><br>احفظه جيداً.`,
            icon: 'success'
        });
        
        redirectByRole(role);
        
    } catch (error) {
        Swal.fire('خطأ', 'حدث خطأ أثناء التسجيل: ' + error.message, 'error');
    }
}

export async function login(email, password, providedCode, selectedRole) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // 1. فحص الكود السري
            if (data.accessCode !== providedCode) {
                await signOut(auth);
                Swal.fire('خطأ', 'كود الدخول السري غير صحيح!', 'error');
                return;
            }

            // 2. فحص الدور (الرتبة)
            if (data.role !== selectedRole) {
                await signOut(auth);
                const roleName = selectedRole === 'admin' ? 'المديرة' : selectedRole === 'secretary' ? 'السكرتير' : 'الطالب';
                Swal.fire('تنبيه', `عذراً، هذا الحساب غير مسجل كـ ${roleName}`, 'warning');
                return;
            }

            Swal.fire({ title: 'نجاح', text: 'جاري تحويلك للوحة التحكم...', icon: 'success', timer: 1500, showConfirmButton: false });
            setTimeout(() => redirectByRole(data.role), 1500);
        }
    } catch (error) {
        Swal.fire('خطأ', 'البريد أو كلمة المرور غير صحيحة', 'error');
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
