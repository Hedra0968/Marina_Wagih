import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// توليد كود سري عشوائي
const generateAccessCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// --- وظيفة التسجيل (Register) ---
export async function register(email, password, name, phone, stage, subject, role) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const accessCode = generateAccessCode();
        
        const userData = {
            uid: userCredential.user.uid,
            name: name,
            email: email,
            phone: phone || '',
            role: role,
            accessCode: accessCode,
            createdAt: new Date(),
            status: (role === 'admin' ? 'active' : 'pending') // المديرة تتفعل تلقائياً
        };

        if (role === 'student') {
            userData.stage = stage;
            userData.subject = subject;
        } else if (role === 'secretary') {
            userData.canApproveAttendance = false;
        }

        await setDoc(doc(db, "users", userCredential.user.uid), userData);
        
        // تسجيل خروج إجباري بعد التسجيل لحين التفعيل
        await signOut(auth);

        await Swal.fire({
            title: 'تم التسجيل بنجاح!',
            html: `
                <div class="p-3 shadow-sm rounded border border-danger">
                    <p class="mb-1">كودك السري هو:</p>
                    <h2 class="text-danger fw-bold">${accessCode}</h2>
                    <p class="small text-muted mt-2">انسخ الكود؛ ستحتاجه في كل عملية دخول.</p>
                </div>
                <p class="mt-3">حسابك الآن قيد المراجعة من الدكتورة مارينا.</p>
            `,
            icon: 'success'
        });
        
        window.location.reload(); 
        
    } catch (error) {
        let msg = "حدث خطأ أثناء التسجيل";
        if (error.code === 'auth/email-already-in-use') msg = "هذا البريد مسجل بالفعل!";
        if (error.code === 'auth/weak-password') msg = "كلمة المرور ضعيفة جداً!";
        Swal.fire('خطأ', msg, 'error');
    }
}

// --- وظيفة تسجيل الدخول (Login) ---
export async function login(email, password, providedCode, selectedRole) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // 1. فحص الكود السري (الأولوية القصوى)
            if (data.accessCode !== providedCode) {
                await signOut(auth);
                Swal.fire('فشل الدخول', 'الكود السري الذي أدخلته غير صحيح!', 'error');
                return;
            }

            // 2. فحص الرتبة (تأكد إنه داخل من الكارت الصح)
            if (data.role !== selectedRole) {
                await signOut(auth);
                Swal.fire('تنبيه', 'هذا الحساب غير مسجل بهذه الرتبة!', 'warning');
                return;
            }

            // 3. فحص التفعيل (لغير المديرين)
            if (data.role !== 'admin' && data.status === 'pending') {
                await signOut(auth);
                Swal.fire('انتظر التفعيل', 'حسابك في انتظار موافقة الإدارة.', 'info');
                return;
            }

            // نجاح الدخول - توجيه المستخدم
            redirectByRole(data.role);
        }
    } catch (error) {
        Swal.fire('خطأ في الدخول', 'تأكد من البريد الإلكتروني وكلمة المرور', 'error');
    }
}

// --- تسجيل الخروج ---
export function logout() {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
}

// --- نظام التوجيه الذكي ---
export function redirectByRole(role) {
    const pages = {
        'admin': 'admin.html',
        'secretary': 'secretary.html',
        'student': 'student.html'
    };
    if (pages[role]) window.location.href = pages[role];
}

// --- مراقب الحماية (Auth Guard) ---
onAuthStateChanged(auth, async (user) => {
    const path = window.location.pathname;
    const isIndex = path.includes('index.html') || path === '/' || path.endsWith('Marina_Wagih/');

    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // لو في صفحة الدخول وهو مسجل أصلاً.. وجهه لصفحته
            if (isIndex) {
                redirectByRole(data.role);
            }
        }
    } else {
        // لو مش مسجل دخول وبيحاول يدخل صفحة داخلية.. ارجعه للرئيسية
        if (!isIndex) {
            window.location.href = 'index.html';
        }
    }
});
