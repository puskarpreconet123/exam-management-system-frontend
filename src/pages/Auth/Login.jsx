import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../components/AuthContext';

export default function AuthPage() {
    // Mode Toggle
    const [isLogin, setIsLogin] = useState(true);
    
    // Logic States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('puskar123@gmail.com');
    const [password, setPassword] = useState('123456');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // Login Logic
                await login(email, password);
                navigate('/dashboard');
            } else {
                // Register Logic
                await api.post('/auth/register', { name, email, password });
                // Switch to login after successful registration
                setIsLogin(true);
                setError(''); 
                alert("Registration successful! Please sign in.");
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setPassword(''); // Clear password for security when switching
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 transition-colors duration-300">
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-slate-950 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                
                {/* Left Side: Branding */}
                <div className="hidden md:flex flex-col justify-center p-12 bg-indigo-600 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500 rounded-full opacity-20" />
                    
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md border border-white/30">
                            <ShieldCheck size={32} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-extrabold mb-6 leading-tight">
                            Secure Enterprise <br /> Exam Portal
                        </h1>
                        <p className="text-indigo-100 text-lg mb-10 max-w-sm">
                            {isLogin 
                                ? "Access your assessments with military-grade encryption and real-time monitoring."
                                : "Join thousands of students and start your certification journey today."}
                        </p>
                        
                        <div className="flex items-center gap-4">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${isLogin ? 'w-12 bg-white' : 'w-6 bg-white/40'}`} />
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${!isLogin ? 'w-12 bg-white' : 'w-6 bg-white/40'}`} />
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="p-8 md:p-14 flex flex-col justify-center bg-white dark:bg-slate-950">
                    <div className="mb-10 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                            {isLogin ? 'Sign In' : 'Join Platform'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            {isLogin ? 'Enter your credentials to continue.' : 'Create your student account below.'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold ml-1 text-slate-700 dark:text-slate-300">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        required={!isLogin}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold ml-1 text-slate-700 dark:text-slate-300">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white"
                                    placeholder="student@university.edu"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                                {isLogin && <button type="button" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Forgot?</button>}
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all mt-4"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                isLogin ? 'Sign In' : 'Create Account'
                            )}
                            {!loading && <ArrowRight size={20} />}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                            {isLogin ? (
                                <span>Don't have an account? <span className="text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-4 ml-1">Register</span></span>
                            ) : (
                                <span>Already have an account? <span className="text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-4 ml-1">Login</span></span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}