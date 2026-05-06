import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';

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

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await api.post('/auth/forgot-password', { email });
            setMessage(response.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-background-light font-sans">
            <div className="hidden lg:block lg:w-1/2 relative">
                <img 
                    src="/auth-bg.png" 
                    alt="Classroom" 
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/5"></div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 overflow-y-auto">
                <div className="max-w-md w-full mx-auto">
                    <div className="mb-8">
                        <Logo />
                    </div>

                    <div className="mb-10">
                        <h1 className="text-4xl font-bold text-slate-900 mb-2">Forgot Password? 🔐</h1>
                        <p className="text-slate-500">No worries, we'll send you reset instructions.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            {message}
                        </div>
                    )}

                    {!message && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Mail size={20} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-primary hover:bg-primary-500 disabled:bg-orange-300 text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transform active:scale-[0.99] transition-all text-base"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>Reset Password <ArrowRight size={20} /></>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="mt-10 text-center">
                        <Link to="/login" className="inline-flex items-center gap-2 text-primary font-bold hover:underline underline-offset-4 text-sm">
                            <ArrowLeft size={16} /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
