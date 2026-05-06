import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Phone, CheckCircle, Navigation, MapPin, Map, CreditCard, Hash, Briefcase, GraduationCap, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../../utils/api';
import { useRecaptcha } from '../../hooks/useRecaptcha';
import { indiaStatesAndDistricts } from '../../utils/indiaStates';
import { useToast } from '../../context/ToastContext';

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

export default function Register() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { executeRecaptcha } = useRecaptcha();
    const [searchParams] = useSearchParams();

    // States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isReferralActive, setIsReferralActive] = useState(false);
    const [referralValidating, setReferralValidating] = useState(false);
    const [referralError, setReferralError] = useState('');
    const [regAmount, setRegAmount] = useState(0);
    const [razorpayKeyId, setRazorpayKeyId] = useState('');
    const [referralMessage, setReferralMessage] = useState('');

    // Form Data State
    const [formData, setFormData] = useState({
        studentName: '', dob: '', board: '', schoolName: '', className: '', studentContact: '', email: '', password: '', confirmPassword: '',
        guardianName: '', guardianContact: '', guardianEmail: '',
        country: 'India', state: '', district: '', locality: '', pin: '', customState: '', customDistrict: '',
        referralCode: searchParams.get('ref') || '',
        paymentType: searchParams.get('ref') ? 'pay_later' : 'pay_now', 
        transactionId: ''
    });

    // Verification States
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [phoneOtpSent, setPhoneOtpSent] = useState(false);
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [phoneOtp, setPhoneOtp] = useState('');
    const [emailOtp, setEmailOtp] = useState('');

    useEffect(() => {
        api.get('/auth/settings')
            .then(res => {
                setRegAmount(res.data.registrationAmount || 0);
                setRazorpayKeyId(res.data.razorpayKeyId || '');
            })
            .catch(err => console.error("Settings fetch failed", err));

        const ref = searchParams.get('ref');
        if (ref) {
            setReferralValidating(true);
            api.post('/auth/verify-referral', { code: ref })
                .then(res => {
                    setIsReferralActive(true);
                    setReferralMessage(res.data.referralMessage || '');
                    setFormData(prev => ({ 
                        ...prev, 
                        referralCode: ref, 
                        paymentType: 'pay_later',
                        schoolName: res.data.schoolName || prev.schoolName 
                    }));
                })
                .catch(err => {
                    const msg = err.response?.data?.message || 'Link Expired or Invalid Referral';
                    setReferralError(msg);
                    showToast(msg, "error");
                    setIsReferralActive(false);
                    setFormData(prev => ({ ...prev, referralCode: '', paymentType: 'pay_now' }));
                })
                .finally(() => setReferralValidating(false));
        } else {
            setIsReferralActive(false);
            setFormData(prev => ({ ...prev, paymentType: 'pay_now' }));
        }
    }, [searchParams]);

    const availableDistricts = formData.state ? indiaStatesAndDistricts[formData.state] || [] : [];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
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

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async () => {
        const res = await loadRazorpayScript();
        if (!res) {
            showToast("Razorpay SDK failed to load. Are you online?", "error");
            return null;
        }

        try {
            const orderRes = await api.post('/payment/create-order', {
                amount: regAmount * 100,
            });

            const { amount, id: order_id, currency } = orderRes.data;

            const options = {
                key: razorpayKeyId,
                amount: amount.toString(),
                currency: currency,
                name: import.meta.env.VITE_APP_TITLE || "Exam Portal",
                description: "Student Registration Fee",
                order_id: order_id,
                handler: async function (response) {
                    try {
                        const verifyRes = await api.post('/payment/verify-payment', response);
                        if (verifyRes.status === 200) {
                            showToast("Payment Successful!", "success");
                            completeRegistration(response.razorpay_payment_id);
                        }
                    } catch (err) {
                        showToast("Payment verification failed", "error");
                        setLoading(false);
                    }
                },
                prefill: {
                    name: formData.studentName,
                    email: formData.email,
                    contact: formData.studentContact,
                },
                theme: {
                    color: "#ff8c32",
                },
                modal: {
                    ondismiss: function() {
                        setLoading(false);
                    }
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (err) {
            showToast("Failed to initiate payment", "error");
            setLoading(false);
        }
    };

    const completeRegistration = async (txnId) => {
        try {
            setLoading(true);
            const captchaToken = await executeRecaptcha('register');
            await api.post('/auth/register', { 
                ...formData, 
                transactionId: txnId,
                captchaToken 
            });
            showToast("Account created successfully! Please sign in.", "success");
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError("Passwords do not match!");
        }

        if (!phoneVerified || !emailVerified) {
            return setError("Please verify both phone and email first.");
        }

        setLoading(true);

        if (formData.paymentType === 'pay_now' && regAmount > 0) {
            await handlePayment();
        } else {
            await completeRegistration(formData.transactionId);
        }
    };

    return (
        <div className="min-h-screen flex bg-background-light font-sans">
            {/* Left Side: Illustration/Image */}
            <div className="hidden lg:block lg:w-2/5 relative">
                <img 
                    src="/auth-bg.png" 
                    alt="Classroom" 
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/5"></div>
            </div>

            {/* Right Side: Form */}
            <div className="w-full lg:w-3/5 flex flex-col px-8 md:px-16 lg:px-20 py-12 overflow-y-auto custom-scrollbar h-screen">
                <div className="max-w-3xl w-full mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <Logo />
                        <Link to="/login" className="text-sm font-bold text-primary hover:underline">
                            Already have an account? Log In
                        </Link>
                    </div>

                    <div className="mb-10">
                        {referralValidating ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-10 bg-slate-100 rounded-lg w-2/3"></div>
                                <div className="h-6 bg-slate-50 rounded-lg w-full"></div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
                                    {isReferralActive ? formData.schoolName : "Create Account ✨"}
                                </h1>
                                <p className="text-slate-500 text-lg leading-relaxed">
                                    {isReferralActive 
                                        ? (referralMessage || "Join our community and start your learning journey today.") 
                                        : "Join our community and start your learning journey today."}
                                </p>
                            </>
                        )}
                    </div>

                    {referralError && (
                        <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center gap-3 text-orange-800 animate-in fade-in slide-in-from-top-4">
                            <div className="size-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                                <span className="material-symbols-outlined">warning</span>
                            </div>
                            <div>
                                <p className="text-sm font-black uppercase tracking-widest leading-none">Referral Issue</p>
                                <p className="text-sm font-bold opacity-80 mt-1">{referralError}</p>
                            </div>
                            <button 
                                onClick={() => setReferralError('')}
                                className="ml-auto p-2 hover:bg-orange-200/50 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-12">
                        {/* Section 1: Student Profile */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                                <User className="text-primary" size={22} /> Student Profile
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput label="Full Name *" name="studentName" value={formData.studentName} onChange={handleInputChange} required placeholder="John Doe" />
                                <FormInput label="Date of Birth *" type="date" name="dob" value={formData.dob} onChange={handleInputChange} required />
                                <FormDropdown label="Board *" name="board" value={formData.board} onChange={handleInputChange} required options={[{ label: 'General', value: 'General' }, { label: 'CBSE', value: 'CBSE' }, { label: 'ICSE', value: 'ICSE' }, { label: 'State Board', value: 'State Board' }]} />
                                <FormInput label="School Name *" name="schoolName" value={formData.schoolName} onChange={handleInputChange} required placeholder="University Name" />
                                <FormDropdown label="Class *" name="className" value={formData.className} onChange={handleInputChange} required options={[{ label: 'General', value: 'General' }, { label: 'Class 5', value: 'Class 5' }, { label: 'Class 6', value: 'Class 6' }, { label: 'Class 7', value: 'Class 7' }, { label: 'Class 8', value: 'Class 8' }, { label: 'Class 9', value: 'Class 9' }, { label: 'Class 10', value: 'Class 10' }, { label: 'Class 11', value: 'Class 11' }, { label: 'Class 12', value: 'Class 12' }]} />

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Contact Number *</label>
                                    <div className="flex gap-2">
                                        <input type="tel" name="studentContact" value={formData.studentContact} onChange={(e) => { handleInputChange(e); setPhoneVerified(false); setPhoneOtpSent(false); }} disabled={phoneVerified} required className="flex-1 px-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 disabled:bg-slate-50" placeholder="10-digit number" />
                                        {phoneOtpSent && !phoneVerified ? (
                                            <div className="flex gap-2 w-40">
                                                <input type="text" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} className="w-full px-3 py-3.5 bg-white border border-slate-200 rounded-xl outline-none" placeholder="OTP" />
                                                <button type="button" onClick={handleVerifyPhoneOtp} className="px-4 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-500">Verify</button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={handleSendPhoneOtp} disabled={phoneVerified || !formData.studentContact} className={`px-4 py-3.5 rounded-xl font-bold text-sm transition-all border ${phoneVerified ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100 disabled:opacity-50'}`}>
                                                {phoneVerified ? <><CheckCircle size={16} className="inline mr-1" /> Verified</> : "Send OTP"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700">Email Address *</label>
                                    <div className="flex gap-2">
                                        <input type="email" name="email" value={formData.email} onChange={(e) => { handleInputChange(e); setEmailVerified(false); setEmailOtpSent(false); }} disabled={emailVerified} required className="flex-1 px-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 disabled:bg-slate-50" placeholder="student@example.com" />
                                        {emailOtpSent && !emailVerified ? (
                                            <div className="flex gap-2 w-40">
                                                <input type="text" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} className="w-full px-3 py-3.5 bg-white border border-slate-200 rounded-xl outline-none" placeholder="OTP" />
                                                <button type="button" onClick={handleVerifyEmailOtp} className="px-4 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-500">Verify</button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={handleSendEmailOtp} disabled={emailVerified || !formData.email} className={`px-4 py-3.5 rounded-xl font-bold text-sm transition-all border ${emailVerified ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100 disabled:opacity-50'}`}>
                                                {emailVerified ? <><CheckCircle size={16} className="inline mr-1" /> Verified</> : "Send OTP"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <FormInput label="Password *" type="password" name="password" value={formData.password} onChange={handleInputChange} required placeholder="••••••••" />
                                <FormInput label="Confirm Password *" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required placeholder="••••••••" />
                            </div>
                        </div>

                        {/* Section 2: Guardian Details */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                                <ShieldCheck className="text-primary" size={22} /> Guardian Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput label="Guardian's Name *" name="guardianName" value={formData.guardianName} onChange={handleInputChange} required placeholder="Parent Name" />
                                <FormInput label="Contact No *" type="tel" name="guardianContact" value={formData.guardianContact} onChange={handleInputChange} required placeholder="10-digit number" />
                                <FormInput label="Email ID" type="email" name="guardianEmail" value={formData.guardianEmail} onChange={handleInputChange} className="md:col-span-2" placeholder="guardian@example.com" />
                            </div>
                        </div>

                        {/* Section 3: Address */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                                <MapPin className="text-primary" size={22} /> Address Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput label="Country" name="country" value={formData.country} readOnly disabled />
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
                                    <FormInput label="Specify State *" name="customState" value={formData.customState} onChange={handleInputChange} required />
                                )}
                                
                                <div className="flex flex-col gap-2">
                                    {formData.state === 'Other' ? (
                                        <FormInput label="District *" name="customDistrict" value={formData.customDistrict} onChange={handleInputChange} required />
                                    ) : (
                                        <FormDropdown
                                            label="District *"
                                            name="district"
                                            value={formData.district}
                                            onChange={handleInputChange}
                                            required
                                            disabled={!formData.state}
                                            options={[
                                                ...availableDistricts.map(dist => ({ label: dist, value: dist })),
                                                { label: 'Other', value: 'Other' }
                                            ]}
                                        />
                                    )}
                                    {formData.district === 'Other' && (
                                        <FormInput label="Specify District *" name="customDistrict" value={formData.customDistrict} onChange={handleInputChange} required />
                                    )}
                                </div>

                                <FormInput label="Locality" name="locality" value={formData.locality} onChange={handleInputChange} placeholder="Area / Street" />
                                <FormInput label="PIN Code *" name="pin" value={formData.pin} onChange={handleInputChange} required placeholder="6-digit code" />
                            </div>
                        </div>

                        {/* Section 4: Payment */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                                <CreditCard className="text-primary" size={22} /> Payment Options
                            </h3>

                            {isReferralActive && (
                                <div className="flex gap-4 p-1.5 bg-slate-50 rounded-2xl max-w-sm">
                                    <button type="button" onClick={() => setFormData({ ...formData, paymentType: 'pay_now' })} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${formData.paymentType === 'pay_now' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                                        Pay Now
                                    </button>
                                    <button type="button" onClick={() => setFormData({ ...formData, paymentType: 'pay_later' })} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${formData.paymentType === 'pay_later' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                                        Pay Later
                                    </button>
                                </div>
                            )}

                            <div className="p-6 bg-orange-50/50 border border-orange-100 rounded-2xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-600 font-medium">Registration Fee</span>
                                    <span className="text-2xl font-bold text-slate-900">₹{regAmount}</span>
                                </div>
                                <p className="text-sm text-slate-500 italic">Secure payment processing via Razorpay</p>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-3.5 bg-primary hover:bg-primary-500 disabled:bg-orange-300 text-white rounded-xl font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transform active:scale-[0.99] transition-all text-base mt-8">
                            {loading ? <Loader2 className="animate-spin" size={22} /> : (formData.paymentType === 'pay_now' && regAmount > 0 ? "Proceed to Payment" : "Create My Account")}
                            {!loading && <ArrowRight size={22} />}
                        </button>
                    </form>
                </div>
            </div>

            <style jsx="true">{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #e2e8f0;
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #cbd5e1;
                }
            `}</style>
        </div>
    );
}

function FormInput({ label, className = '', type, ...props }) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="text-sm font-bold text-slate-700 ml-1">{label}</label>
            <div className="relative group">
                <input
                    type={isPassword ? (showPassword ? 'text' : 'password') : type}
                    className={`w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 ${isPassword ? 'pr-12' : ''}`}
                    {...props}
                />
                {isPassword && (
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}
            </div>
        </div>
    );
}

function FormDropdown({ label, options, value, onChange, name, required, disabled, className = '' }) {
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
            <label className="text-sm font-bold text-slate-700 ml-1">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full text-left px-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all flex items-center justify-between ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : value ? 'text-slate-900' : 'text-slate-400'}`}
                >
                    <span className="truncate">{selectedLabel}</span>
                    <svg className={`fill-current h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                </button>

                {isOpen && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {options.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange({ target: { name, value: opt.value } });
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${value === opt.value ? 'bg-orange-50 text-primary' : 'text-slate-700 hover:bg-slate-50'}`}
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

