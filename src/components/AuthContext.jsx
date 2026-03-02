import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { setLogoutHandler } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLogoutHandler(() => {
            logout(true);
        });
    }, [navigate]);
    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            // In a real app we might fetch user profile here. For now, trusting token exists.
            const storedUser = localStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        setToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        return res.data;
    };

    const register = async (name, email, password) => {
    try {
        const res = await api.post('/auth/register', { name, email, password });
        // After registering, you might want to automatically log them in 
        // OR just return the success message.
        return res.data;
    } catch (error) {
        throw error;
    }
  };
  const logout = async (silent = false) => {
  try {
    if (!silent) {
      await api.post("/auth/logout");
    }
  } catch (e) {
    console.error(e);
  } finally {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login"); // 🔥 React navigation
  }
};
    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};
