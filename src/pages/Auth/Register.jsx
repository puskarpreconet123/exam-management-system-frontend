import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Phone, CheckCircle, Navigation, MapPin, Map, CreditCard, Hash, Briefcase, GraduationCap, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { useRecaptcha } from '../../hooks/useRecaptcha';
import { indiaStatesAndDistricts } from '../../utils/indiaStates';
import { useToast } from '../../context/ToastContext';

export default function Register() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { executeRecaptcha } = useRecaptcha();

    const [searchParams] = useSearchParams();

    // States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form Data State
    const [formData, setFormData] = useState({
        // Student Details
        studentName: '', dob: '', board: '', schoolName: '', className: '', studentContact: '', email: '', password: '', confirmPassword: '',
        // Guardian Details
        guardianName: '', guardianContact: '', guardianEmail: '',
        // Address
        country: 'India', state: '', district: '', locality: '', pin: '', customState: '', customDistrict: '',
        // Referral
        referralCode: searchParams.get('ref') || '',
        // Payment
        paymentType: 'pay_later', transactionId: ''
    });

    // Verification States
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [phoneOtpSent, setPhoneOtpSent] = useState(false);
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [phoneOtp, setPhoneOtp] = useState('');
    const [emailOtp, setEmailOtp] = useState('');

    // Derived District List
    const availableDistricts = formData.state ? indiaStatesAndDistricts[formData.state] || [] : [];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // If state changes, reset the district
        if (name === 'state') {
            setFormData(prev => ({ ...prev, state: value, district: '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSendPhoneOtp = async () => {
        if (!formData.studentContact) return showToast("Please enter a contact number first", "error");
        try {
            await api.post('/auth/send-otp', { contact: formData.studentContact, type: 'phone' });
            setPhoneOtpSent(true);
            showToast("OTP sent to mobile!", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to send OTP", "error");
        }
    };

    const handleVerifyPhoneOtp = async () => {
        if (!phoneOtp) return showToast("Please enter OTP", "error");
        try {
            await api.post('/auth/verify-otp', { contact: formData.studentContact, type: 'phone', otp: phoneOtp });
            setPhoneVerified(true);
            setPhoneOtpSent(false);
            showToast("Phone verified successfully!", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Invalid OTP", "error");
        }
    };

    const handleSendEmailOtp = async () => {
        if (!formData.email) return showToast("Please enter an email address first", "error");
        try {
            await api.post('/auth/send-otp', { contact: formData.email, type: 'email' });
            setEmailOtpSent(true);
            showToast("OTP sent to email!", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to send OTP", "error");
        }
    };

    const handleVerifyEmailOtp = async () => {
        if (!emailOtp) return showToast("Please enter OTP", "error");
        try {
            await api.post('/auth/verify-otp', { contact: formData.email, type: 'email', otp: emailOtp });
            setEmailVerified(true);
            setEmailOtpSent(false);
            showToast("Email verified successfully!", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Invalid OTP", "error");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError("Passwords do not match!");
        }

        setLoading(true);
        try {
            const captchaToken = await executeRecaptcha('register');
            const res = await api.post('/auth/register', { ...formData, captchaToken });
            alert("Account created successfully! Please sign in.");
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 md:p-6 transition-colors duration-300">
            {/* Using a max-w-6xl container with height limit for smooth scrolling inside */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-5 bg-white dark:bg-slate-950 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 md:h-[90vh]">

                {/* Left Side: Branding (Sticky/Fixed visually if right side scrolls) */}
                <div className="hidden md:flex flex-col justify-center p-12 bg-indigo-600 text-white relative overflow-hidden md:col-span-2">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500 rounded-full opacity-20" />
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md border border-white/30">
                            <ShieldCheck size={32} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-extrabold mb-6 leading-tight">
                            Secure Enterprise <br /> Exam Portal
                        </h1>
                        <p className="text-indigo-100 text-lg mb-10 max-w-sm">
                            Join thousands of students and start your certification journey today.
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="h-1.5 w-6 bg-white/40 rounded-full transition-all duration-500" />
                            <div className="h-1.5 w-12 bg-white rounded-full transition-all duration-500" />
                        </div>
                    </div>
                </div>

                {/* Right Side: Form (Scrollable area) */}
                <div className="p-8 md:p-12 bg-white dark:bg-slate-950 md:col-span-3 overflow-y-auto custom-scrollbar">
                    <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
                        <Link to="/login" className="inline-flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4 transition-colors">
                            &larr; Back to Login
                        </Link>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            Join Platform
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            Create your complete student profile to get started. Fields marked with * are required.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* 1. Student Details Section */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <User className="text-indigo-500" size={20} /> Student Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="Student's Name *" icon={User} name="studentName" value={formData.studentName} onChange={handleInputChange} required />
                                <FormInput label="Date of Birth *" type="date" name="dob" value={formData.dob} onChange={handleInputChange} required />
                                <FormDropdown label="Board *" icon={GraduationCap} name="board" value={formData.board} onChange={handleInputChange} required options={[{ label: 'General', value: 'General' }, { label: 'CBSE', value: 'CBSE' }, { label: 'ICSE', value: 'ICSE' }, { label: 'State Board', value: 'State Board' }]} />
                                <FormInput label="School Name *" icon={Briefcase} name="schoolName" value={formData.schoolName} onChange={handleInputChange} required />
                                <FormDropdown label="Class *" name="className" value={formData.className} onChange={handleInputChange} required options={[{ label: 'General', value: 'General' }, { label: 'Class 5', value: 'Class 5' }, { label: 'Class 6', value: 'Class 6' }, { label: 'Class 7', value: 'Class 7' }, { label: 'Class 8', value: 'Class 8' }, { label: 'Class 9', value: 'Class 9' }, { label: 'Class 10', value: 'Class 10' }, { label: 'Class 11', value: 'Class 11' }, { label: 'Class 12', value: 'Class 12' }]} />

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold ml-1 text-slate-700 dark:text-slate-300">Student Contact No *</label>
                                    <div className="flex gap-2">
                                        <div className="relative group flex-1">
                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                            <input type="tel" name="studentContact" value={formData.studentContact} onChange={(e) => { handleInputChange(e); setPhoneVerified(false); setPhoneOtpSent(false); }} disabled={phoneVerified} required className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white disabled:opacity-60" placeholder="10-digit number" />
                                        </div>
                                        {phoneOtpSent && !phoneVerified ? (
                                            <div className="flex gap-2 w-48">
                                                <input type="text" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} className="w-full px-3 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl outline-none" placeholder="OTP" />
                                                <button type="button" onClick={handleVerifyPhoneOtp} className="px-4 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition">Verify</button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={handleSendPhoneOtp} disabled={phoneVerified || !formData.studentContact} className={`px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${phoneVerified ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 disabled:opacity-50'}`}>
                                                {phoneVerified ? <><CheckCircle size={16} /> Verified</> : "Send OTP"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold ml-1 text-slate-700 dark:text-slate-300">Email Address *</label>
                                    <div className="flex gap-2">
                                        <div className="relative group flex-1">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                            <input type="email" name="email" value={formData.email} onChange={(e) => { handleInputChange(e); setEmailVerified(false); setEmailOtpSent(false); }} disabled={emailVerified} required className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white disabled:opacity-60" placeholder="student@example.com" />
                                        </div>
                                        {emailOtpSent && !emailVerified ? (
                                            <div className="flex gap-2 w-48">
                                                <input type="text" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} className="w-full px-3 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl outline-none" placeholder="OTP" />
                                                <button type="button" onClick={handleVerifyEmailOtp} className="px-4 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition">Verify</button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={handleSendEmailOtp} disabled={emailVerified || !formData.email} className={`px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${emailVerified ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 disabled:opacity-50'}`}>
                                                {emailVerified ? <><CheckCircle size={16} /> Verified</> : "Send OTP"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <FormInput label="Set Password *" icon={Lock} type="password" name="password" value={formData.password} onChange={handleInputChange} required placeholder="••••••••" />
                                <FormInput label="Confirm Password *" icon={Lock} type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required placeholder="••••••••" />
                            </div>
                        </div>

                        {/* 2. Guardian Details Section */}
                        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <ShieldCheck className="text-indigo-500" size={20} /> Guardian Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="Guardian's Name *" icon={User} name="guardianName" value={formData.guardianName} onChange={handleInputChange} required />
                                <FormInput label="Contact No *" icon={Phone} type="tel" name="guardianContact" value={formData.guardianContact} onChange={handleInputChange} required />
                                <FormInput label="Email ID" icon={Mail} type="email" name="guardianEmail" value={formData.guardianEmail} onChange={handleInputChange} className="md:col-span-2" />
                            </div>
                        </div>

                        {/* 3. Address Section */}
                        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Map className="text-indigo-500" size={20} /> Address Section
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="Country" icon={Navigation} name="country" value={formData.country}  onClick={()=>showToast("This System Built Only For Indian Student")} readOnly disabled />

                                <div className="flex flex-col gap-2">
                                    <FormDropdown
                                        label="State *"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        required
                                        options={[
                                            ...Object.keys(indiaStatesAndDistricts).map(state => ({ label: state, value: state })),
                                            { label: 'Other', value: 'Other' }
                                        ]}
                                    />
                                    {formData.state === 'Other' && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <input type="text" name="customState" value={formData.customState} onChange={handleInputChange} required className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white" placeholder="Type State Name" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    {formData.state === 'Other' ? (
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold ml-1 text-slate-700 dark:text-slate-300">District *</label>
                                            <input type="text" name="customDistrict" value={formData.customDistrict} onChange={handleInputChange} required className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white" placeholder="Type District Name" />
                                        </div>
                                    ) : (
                                        <>
                                            <FormDropdown
                                                label="District *"
                                                name="district"
                                                value={formData.district}
                                                onChange={handleInputChange}
                                                required
                                                disabled={!formData.state}
                                                onDisabledClick={() => showToast("First Select State", "error")}
                                                options={[
                                                    ...availableDistricts.map(dist => ({ label: dist, value: dist })),
                                                    { label: 'Other', value: 'Other' }
                                                ]}
                                            />
                                            {formData.district === 'Other' && (
                                                <div className="animate-in fade-in slide-in-from-top-2">
                                                    <input type="text" name="customDistrict" value={formData.customDistrict} onChange={handleInputChange} required className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white" placeholder="Type District Name" />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <FormInput label="Locality" icon={MapPin} name="locality" value={formData.locality} onChange={handleInputChange} />
                                <FormInput label="PIN Code *" icon={Hash} name="pin" value={formData.pin} onChange={handleInputChange} required />
                            </div>
                        </div>

                        {/* 4. Referral Code */}
                        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <User className="text-indigo-500" size={20} /> Referral
                            </h3>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold ml-1 text-slate-700 dark:text-slate-300">Referral Code (Optional)</label>
                                <div className="flex gap-2">
                                    <div className="relative group flex-1">
                                        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            name="referralCode"
                                            value={formData.referralCode}
                                            onChange={handleInputChange}
                                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white uppercase disabled:opacity-70 disabled:bg-slate-100"
                                            placeholder="Got a code?"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. Payment Section */}
                        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <CreditCard className="text-indigo-500" size={20} /> Payment Options
                            </h3>

                            <div className="flex gap-4 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl max-w-sm">
                                <button type="button" onClick={() => setFormData({ ...formData, paymentType: 'pay_now' })} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${formData.paymentType === 'pay_now' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                                    Pay Now
                                </button>
                                <button type="button" onClick={() => setFormData({ ...formData, paymentType: 'pay_later' })} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${formData.paymentType === 'pay_later' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                                    Pay Later
                                </button>
                            </div>

                            {formData.paymentType === 'pay_now' && (
                                <div className="animate-in slide-in-from-top-4 fade-in duration-300 transform origin-top">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-4 text-sm text-indigo-800 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-800/50 flex flex-col gap-1">
                                        <span>Please complete your payment to the institute bank or UPI account.</span>
                                        <span className="font-bold">UPI ID: exam@institute | Amount: ₹500</span>
                                    </div>
                                    <FormInput label="Transaction ID *" icon={Hash} name="transactionId" value={formData.transactionId} onChange={handleInputChange} required={formData.paymentType === 'pay_now'} placeholder="Enter UPI / Bank Ref No." />
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all mt-8 text-lg">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "Create Account"}
                            {!loading && <ArrowRight size={20} />}
                        </button>
                    </form>
                </div>
            </div>

            {/* Embedded styles for the custom scrollbar */}
            <style jsx="true">{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 20px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #334155;
                }
            `}</style>
        </div>
    );
}

// Extracted small reusable component for inputs to keep form clean
function FormInput({ label, icon: Icon, className = '', disabled, ...props }) {
    return (
        <div className={`space-y-2 ${className}`}>
            <label className="text-sm font-semibold ml-1 text-slate-700 dark:text-slate-300">{label}</label>
            <div className="relative group">
                {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors " size={18} />}
                <input
                    className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white read-only:bg-slate-100 dark:read-only:bg-slate-800 ${disabled 
  ? 'text-slate-400 cursor-not-allowed opacity-70' 
  : ''}`}
                    readOnly={disabled || props.readOnly}
                    {...props}
                />
            </div>
        </div>
    );
}

function FormDropdown({ label, icon: Icon, options, value, onChange, name, required, disabled, onDisabledClick, className = '' }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(opt => opt.value === value)?.label || `Select ${label.replace(' *', '')}`;

    return (
        <div className={`space-y-2 ${className}`} ref={dropdownRef}>
            <label className="text-sm font-semibold ml-1 text-slate-700 dark:text-slate-300">{label}</label>
            <div className="relative group">
                {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10" size={18} />}

                {/* Visually hidden input for tracking form submission state and native required validation */}
                <input
                    type="text"
                    name={name}
                    value={value}
                    onChange={() => { }}
                    required={required}
                    className="opacity-0 absolute inset-0 w-full h-full -z-10"
                    tabIndex={-1}
                />

                <button
                    type="button"
                    onClick={() => {
                        if (disabled) {
                            if (onDisabledClick) onDisabledClick();
                        } else {
                            setIsOpen(!isOpen);
                        }
                    }}
                    className={`w-full text-left ${Icon ? 'pl-11' : 'pl-4'} pr-10 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${disabled ? 'opacity-50 cursor-not-allowed text-slate-500 dark:text-slate-500' : value ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    {selectedLabel}
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                        <svg className={`fill-current h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                    </div>
                </button>

                {isOpen && !disabled && (
                    <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {/* 10.5rem max height corresponds to roughly 4 items, keeping the UI compact */}
                        <div className="max-h-[10.5rem] overflow-y-auto custom-scrollbar flex flex-col p-1">
                            {options.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange({ target: { name, value: opt.value } });
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${value === opt.value ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
