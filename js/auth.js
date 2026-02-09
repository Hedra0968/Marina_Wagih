/* JS File: auth.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Core: Firebase Authentication & Security Logic (Enhanced)
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const accessCode = generateAccessCode(); // توليد الكود هنا لضمان التطابق
        
        const userData = {
            uid: userCredential.user.uid,
            name: name,
            email: email.toLowerCase(),
            phone: phone || "غير مسجل",
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
