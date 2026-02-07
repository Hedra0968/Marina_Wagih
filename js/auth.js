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

// --- التسجيل ---
export async function register(email, password, name, phone, stage, subject, role) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const accessCode = generateAccessCode();
        
        const userData = {
            uid: userCredential.user.uid,
            name, email, phone, role, accessCode,
            createdAt: new Date(),
            status: 'pending' // معلق حتى موافقة مارينا
        };

        if (role === 'student') {
            userData.stage = stage;
            userData.subject = subject;
        } else if (role === 'secretary') {
            userData.canApproveAttendance = false;
        }

        await setDoc(doc(db, "users", userCredential.user.uid), userData);
        
        // تسجيل خروج عشان ميفضلش فاتح وهو لسه متفعلش
        await signOut(auth);

        await Swal.fire({
            title: 'تم التسجيل!',
            html: `كودك السري: <b style="color:red; font-size:20px;">${accessCode}</b><br>حسابك قيد المراجعة حالياً.`,
            icon: 'info'
        });
        
        window.location.reload(); // تنشيط الصفحة
        
    } catch (error) {
        Swal.fire('خطأ', error.message, 'error');
    }
}

// --- تسجيل الدخول ---
export async function login(email, password, providedCode, selectedRole) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // 1. فحص التفعيل (المديرة تدخل فوراً)
            if (data.role !== 'admin' && data.status === 'pending') {
                await signOut(auth);
                Swal.fire('انتظر التفعيل', 'حسابك لسه متفعلش من المديرة مارينا.', 'warning');
                return;
            }

            // 2. فحص الكود
            if (data.accessCode !== providedCode) {
                await signOut(auth);
                Swal.fire('خطأ', 'الكود السري غلط!', 'error');
                return;
            }

            // 3. فحص الرتبة
            if (data.role !== selectedRole) {
                await signOut(auth);
                Swal.fire('تنبيه', 'أنت مسجل برتبة تانية!', 'warning');
                return;
            }

            // نجاح الدخول
            redirectByRole(data.role);
        }
    } catch (error) {
        Swal.fire('خطأ', 'الإيميل أو الباسورد غلط', 'error');
    }
}

export function logout() {
    signOut(auth).then(() => window.location.href = 'index.html');
}

export function redirectByRole(role) {
    if (role === 'admin') window.location.href = 'admin.html';
    else if (role === 'secretary') window.location.href = 'secretary.html';
    else if (role === 'student') window.location.href = 'student.html';
}

// مراقب الحالة (عشان محدش يدخل بـ URL وهو مش مسجل)
onAuthStateChanged(auth, async (user) => {
    const path = window.location.pathname;
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            // لو هو مش مدير وحسابه لسه "Pending" اطرده بره الصفحات المحمية
            if (data.role !== 'admin' && data.status === 'pending' && !path.includes('index.html')) {
                signOut(auth);
                window.location.href = 'index.html';
            }
        }
    } else {
        if (!path.includes('index.html') && path !== '/') {
            window.location.href = 'index.html';
        }
    }
});
