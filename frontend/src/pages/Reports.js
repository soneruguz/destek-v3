import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import axiosInstance from '../utils/axios';
import { API_ROUTES } from '../config/apiConfig';
import Select from 'react-select';

const Reports = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('dashboard');

    // Dashboard State
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Search State
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);

    const [filters, setFilters] = useState({
        query: '',
        status: [],
        priority: [],
        department_ids: [],
        user_ids: [],
        start_date: '',
        end_date: ''
    });

    // Load Dashboard Data
    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchStats();
        }
    }, [activeTab]);

    // Load Filter Options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [deptRes, userRes] = await Promise.all([
                    axiosInstance.get(API_ROUTES.DEPARTMENTS),
                    axiosInstance.get(API_ROUTES.USERS)
                ]);
                setDepartments(deptRes.data.map(d => ({ value: d.id, label: d.name })));
                setUsers(userRes.data.map(u => ({ value: u.id, label: `${u.full_name} (${u.username})` })));
            } catch (err) {
                console.error('Error loading options:', err);
            }
        };
        if (activeTab === 'search') {
            fetchOptions();
        }
    }, [activeTab]);

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const res = await axiosInstance.get(API_ROUTES.REPORTS_STATS);
            setStats(res.data);
        } catch (err) {
            addToast('İstatistikler yüklenirken hata oluştu', 'error');
        } finally {
            setLoadingStats(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoadingSearch(true);
        try {
            // Convert select objects to values
            const payload = {
                ...filters,
                status: filters.status.map(s => s.value),
                priority: filters.priority.map(p => p.value),
                department_ids: filters.department_ids.map(d => d.value),
                user_ids: filters.user_ids.map(u => u.value)
            };

            const res = await axiosInstance.post(API_ROUTES.REPORTS_SEARCH, payload);
            setSearchResults(res.data);
        } catch (err) {
            addToast('Arama yapılırken hata oluştu', 'error');
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleExport = async () => {
        try {
            const payload = {
                ...filters,
                status: filters.status.map(s => s.value),
                priority: filters.priority.map(p => p.value),
                department_ids: filters.department_ids.map(d => d.value),
                user_ids: filters.user_ids.map(u => u.value)
            };

            const response = await axiosInstance.post(API_ROUTES.REPORTS_EXPORT, payload, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `rapor_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            addToast('Dışa aktarma başarılı', 'success');
        } catch (err) {
            addToast('Dışa aktarılırken hata oluştu', 'error');
        }
    };

    const statusOptions = [
        { value: 'open', label: 'Açık' },
        { value: 'in_progress', label: 'İşlemde' },
        { value: 'resolved', label: 'Çözüldü' },
        { value: 'closed', label: 'Kapalı' }
    ];

    const priorityOptions = [
        { value: 'low', label: 'Düşük' },
        { value: 'medium', label: 'Orta' },
        { value: 'high', label: 'Yüksek' },
        { value: 'urgent', label: 'Acil' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900">Raporlar ve Arama</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`${activeTab === 'dashboard'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Genel Bakış
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`${activeTab === 'search'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Gelişmiş Arama
                    </button>
                    <button
                        onClick={() => setActiveTab('personnel')}
                        className={`${activeTab === 'personnel'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Personel Performansı
                    </button>
                </nav>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {loadingStats ? (
                        <div className="text-center py-10">Yükleniyor...</div>
                    ) : stats ? (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Toplam Talep</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.total_tickets}</dd>
                                </div>
                                <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Açık Talepler</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-blue-600">{stats.status_distribution.open || 0}</dd>
                                </div>
                                <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Çözülen</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.status_distribution.resolved || 0}</dd>
                                </div>
                                <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                                    <dt className="text-sm font-medium text-gray-500 truncate">Kapalı</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-600">{stats.status_distribution.closed || 0}</dd>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Department Distribution */}
                                <div className="bg-white shadow rounded-lg p-6">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Departman Dağılımı</h3>
                                    <div className="space-y-4">
                                        {Object.entries(stats.department_distribution).map(([name, count]) => (
                                            <div key={name}>
                                                <div className="flex justify-between text-sm font-medium">
                                                    <span>{name}</span>
                                                    <span>{count}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                                                    <div
                                                        className="bg-primary-600 h-2.5 rounded-full"
                                                        style={{ width: `${(count / stats.total_tickets) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Priority Distribution */}
                                <div className="bg-white shadow rounded-lg p-6">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Öncelik Dağılımı</h3>
                                    <div className="space-y-4">
                                        {Object.entries(stats.priority_distribution).map(([priority, count]) => (
                                            <div key={priority}>
                                                <div className="flex justify-between text-sm font-medium">
                                                    <span className="capitalize">{priority}</span>
                                                    <span>{count}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                                                    <div
                                                        className={`h-2.5 rounded-full ${priority === 'urgent' ? 'bg-red-600' :
                                                            priority === 'high' ? 'bg-orange-500' :
                                                                priority === 'medium' ? 'bg-blue-500' : 'bg-green-500'
                                                            }`}
                                                        style={{ width: `${(count / stats.total_tickets) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 text-gray-500">Veri bulunamadı</div>
                    )}
                </div>
            )}

            {activeTab === 'search' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Arama Metni</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        placeholder="Başlık veya açıklama..."
                                        value={filters.query}
                                        onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Başlangıç</label>
                                        <input
                                            type="date"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                            value={filters.start_date}
                                            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Bitiş</label>
                                        <input
                                            type="date"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                            value={filters.end_date}
                                            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Durum</label>
                                    <Select
                                        isMulti
                                        options={statusOptions}
                                        value={filters.status}
                                        onChange={(val) => setFilters({ ...filters, status: val })}
                                        placeholder="Tümü"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Öncelik</label>
                                    <Select
                                        isMulti
                                        options={priorityOptions}
                                        value={filters.priority}
                                        onChange={(val) => setFilters({ ...filters, priority: val })}
                                        placeholder="Tümü"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Departman</label>
                                    <Select
                                        isMulti
                                        options={departments}
                                        value={filters.department_ids}
                                        onChange={(val) => setFilters({ ...filters, department_ids: val })}
                                        placeholder="Tümü"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Kullanıcı (Oluşturan/Atanan)</label>
                                    <Select
                                        isMulti
                                        options={users}
                                        value={filters.user_ids}
                                        onChange={(val) => setFilters({ ...filters, user_ids: val })}
                                        placeholder="Tümü"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <button
                                    type="button"
                                    onClick={handleExport}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                    CSV İndir
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                    {loadingSearch ? 'Aranıyor...' : 'Ara'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Results Table */}
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlık</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öncelik</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departman</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                                        <th className="relative px-6 py-3"><span className="sr-only">Detay</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {searchResults.length > 0 ? (
                                        searchResults.map((ticket) => (
                                            <tr key={ticket.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{ticket.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.title}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                                        ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                                            ticket.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {ticket.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.priority}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.department}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <a href={`/tickets/${ticket.id}`} className="text-primary-600 hover:text-primary-900">Görüntüle</a>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-4 text-center text-gray-500">Sonuç bulunamadı</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'personnel' && (
                <PersonnelReports
                    filters={filters}
                    setFilters={setFilters}
                    departments={departments}
                    statusOptions={statusOptions}
                    priorityOptions={priorityOptions}
                />
            )}
        </div>
    );
};

const PersonnelReports = ({ filters, setFilters, departments }) => {
    const [stats, setStats] = useState({ creators: [], resolvers: [] });
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const fetchPersonnelStats = async () => {
        setLoading(true);
        try {
            const payload = {
                ...filters,
                department_ids: filters.department_ids.map(d => d.value),
            };
            const res = await axiosInstance.post(API_ROUTES.REPORTS_PERSONNEL, payload);
            setStats(res.data);
        } catch (err) {
            console.error(err);
            addToast('Personel verileri yüklenirken hata oluştu', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPersonnelStats();
    }, []);

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Başlangıç</label>
                        <input
                            type="date"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            value={filters.start_date}
                            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Bitiş</label>
                        <input
                            type="date"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            value={filters.end_date}
                            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={fetchPersonnelStats}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            {loading ? 'Yükleniyor...' : 'Filtrele'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* En Çok Talep Açanlar */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">En Çok Talep Açan Personeller</h3>
                    </div>
                    <div className="border-t border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personel</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birim</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acil/Yüksek</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stats.creators.map((user, idx) => (
                                        <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.full_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.department}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{user.total_tickets}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                                {user.priority_breakdown.urgent + user.priority_breakdown.high}
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.creators.length === 0 && (
                                        <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">Veri yok</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* En Çok Talep Çözenler */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">En Çok Talep Çözen Personeller</h3>
                    </div>
                    <div className="border-t border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personel</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birim</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atanan/Çözülen</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ort. Süre</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stats.resolvers.map((user, idx) => (
                                        <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.full_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.department}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="font-bold">{user.total_resolved}</span> / {user.total_assigned}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.avg_resolution_time > 0 ? `${user.avg_resolution_time} sa` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.resolvers.length === 0 && (
                                        <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">Veri yok</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
