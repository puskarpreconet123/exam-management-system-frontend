import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const PERMISSIONS = [
    { id: 'questions', label: 'Question Bank', icon: 'quiz' },
    { id: 'exams', label: 'Exams & Scheduling', icon: 'description' },
    { id: 'monitoring', label: 'Live Monitoring', icon: 'monitoring' },
    { id: 'evaluation', label: 'Evaluation & Results', icon: 'fact_check' },
    { id: 'students', label: 'Student Management', icon: 'manage_accounts' },
    { id: 'referrals', label: 'Referral Management', icon: 'group_add' },
];

export default function EmployeeManagementPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        permissions: [],
        role: 'employee'
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/employees');
            setEmployees(res.data.employees);
        } catch (error) {
            showToast('Failed to fetch employees', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (employee = null) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData({
                name: employee.name,
                email: employee.email,
                password: '', // Don't show password
                permissions: employee.permissions || [],
                role: employee.role
            });
        } else {
            setEditingEmployee(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                permissions: [],
                role: 'employee'
            });
        }
        setShowModal(true);
    };

    const handlePermissionToggle = (permId) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(p => p !== permId)
                : [...prev.permissions, permId]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingEmployee) {
                await api.patch(`/admin/employees/${editingEmployee._id}`, formData);
                showToast('Employee updated successfully', 'success');
            } else {
                await api.post('/admin/employees', formData);
                showToast('Employee created successfully', 'success');
            }
            setShowModal(false);
            fetchEmployees();
        } catch (error) {
            showToast(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this employee?')) return;
        try {
            await api.delete(`/admin/employees/${id}`);
            showToast('Employee removed successfully', 'success');
            fetchEmployees();
        } catch (error) {
            showToast('Failed to remove employee', 'error');
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Employee Management</h1>
                    <p className="text-slate-500 dark:text-slate-400">Create and manage staff accounts with specific task permissions.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-all shadow-md shadow-teal-500/20 font-semibold"
                >
                    <span className="material-symbols-outlined">add</span>
                    <span>Add Employee</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Employee</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Permissions</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-10 w-40 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 w-60 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic">
                                        No employees found. Add your first employee to get started.
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                                                    {emp.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-white">{emp.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{emp.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {emp.permissions.length === 0 ? (
                                                    <span className="text-xs text-slate-400 italic">No permissions</span>
                                                ) : (
                                                    emp.permissions.map(p => (
                                                        <span key={p} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-medium uppercase tracking-wider">
                                                            {p.replace('_', ' ')}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(emp)}
                                                    className="p-2 text-slate-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-all"
                                                    title="Edit Permissions"
                                                >
                                                    <span className="material-symbols-outlined text-xl">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(emp._id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    title="Remove Employee"
                                                >
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {editingEmployee ? 'Change Password (leave blank to keep current)' : 'Password'}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingEmployee}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Permissions & Tasks</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {PERMISSIONS.map((perm) => (
                                        <button
                                            key={perm.id}
                                            type="button"
                                            onClick={() => handlePermissionToggle(perm.id)}
                                            className={`
                                                flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left
                                                ${formData.permissions.includes(perm.id)
                                                    ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400'
                                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                                }
                                            `}
                                        >
                                            <span className={`material-symbols-outlined text-xl ${formData.permissions.includes(perm.id) ? 'text-teal-500' : 'text-slate-400'}`}>
                                                {perm.icon}
                                            </span>
                                            <span className="text-xs font-semibold leading-tight">{perm.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold shadow-md shadow-teal-500/20 transition-all"
                                >
                                    {editingEmployee ? 'Save Changes' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
