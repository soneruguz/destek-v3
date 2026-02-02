import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';

function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const [logoUrl, setLogoUrl] = useState(null);

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axiosInstance.get('config/');
        if (res.data.custom_logo_url) {
          // Use current origin for logo URL (same domain as frontend)
          setLogoUrl(`${window.location.origin}/uploads${res.data.custom_logo_url}`);
        }
      } catch (err) {
        console.error('Config load error:', err);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use URLSearchParams for application/x-www-form-urlencoded
      const params = new URLSearchParams();
      params.append('username', credentials.username.trim());
      params.append('password', credentials.password);

      const response = await axiosInstance.post('auth/token/', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = response.data;


      // Check if we have the required fields
      if (!data || !data.access_token) {
        console.error('Invalid response from server:', data);
        setError('Sunucudan geçersiz yanıt alındı. Lütfen tekrar deneyin.');
        return;
      }

      // Login with token and user data
      authLogin(data.access_token, data.user || {});

      // Navigate immediately
      navigate('/');

    } catch (err) {
      console.error('Login error:', err);
      setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-2 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div>
          <div className="flex justify-center mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-24 w-auto object-contain" />
            ) : null}
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Destek Sistemi
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hesabınızla giriş yapın
          </p>
        </div>
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Kullanıcı adı"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Şifre"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default Login;
