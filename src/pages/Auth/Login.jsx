import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../components/AuthContext';
import { useRecaptcha } from '../../hooks/useRecaptcha';

const Logo = () => (
    <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck size={24} className="text-white" />
        </div>
        <span className="text-2xl font-bold text-slate-800 tracking-tight">
            {import.meta.env.VITE_APP_TITLE || "EduDash"}
        </span>
    </div>
);

export default function Login() {
    // Logic States
    const [email, setEmail] = useState('puskar.preconet@gmail.com');
    const [password, setPassword] = useState('Puskar@preconet');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const { executeRecaptcha } = useRecaptcha();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const captchaToken = await executeRecaptcha('login');
            const response = await login(email, password, captchaToken, rememberMe);
            if (response.user.role === 'admin' || response.user.role === 'employee') {
                navigate('/admin/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            if (err.message?.includes('reCAPTCHA')) {
                setError('Security check failed. Please refresh the page and try again.');
            } else {
                setError(err.response?.data?.message || 'Authentication failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-background-light font-sans">
            {/* Left Side: Illustration/Image */}
            <div className="hidden lg:block lg:w-1/2 relative">
                <img 
                    src="/auth-bg.png" 
                    alt="Classroom" 
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/5"></div>
            </div>

            {/* Right Side: Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 overflow-y-auto">
                <div className="max-w-md w-full mx-auto">
                    <div className="mb-8">
                        <Logo />
                    </div>

                    <div className="mb-10">
                        <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome Back 👋</h1>
                        <p className="text-slate-500">Log in to your account to continue</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400"
                                    placeholder="Enter your email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 pr-12"
                                    placeholder="Enter your password"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary transition-all cursor-pointer"
                                />
                                <span className="text-sm text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
                            </label>
                            <Link to="/forgot-password" core="true" className="text-sm font-bold text-primary hover:text-primary-500 transition-colors">
                                Forgot Password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-primary hover:bg-primary-500 disabled:bg-orange-300 text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transform active:scale-[0.99] transition-all text-base"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                "Log In"
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-slate-500 text-sm">
                            Don't have an account? 
                            <Link to="/register" className="ml-1 text-primary font-bold hover:underline underline-offset-4">Sign Up</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}