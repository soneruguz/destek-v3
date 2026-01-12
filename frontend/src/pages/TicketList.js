import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../utils/axios';

const TicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ status: '', department: '', priority: '' });
  
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await axiosInstance.get('/tickets/');
        setTickets(response.data);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setError('Talepler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTickets();
  }, []);
  
  // Filter tickets based on selected filters
  const filteredTickets = tickets.filter(ticket => {
    if (filter.status && ticket.status !== filter.status) return false;
    if (filter.department && ticket.department_id !== parseInt(filter.department)) return false;
    if (filter.priority && ticket.priority !== filter.priority) return false;
    return true;
  });
  
  if (loading) return <div className="loading">Talepler yükleniyor...</div>;
  
  return (
    <div className="ticket-list-page">
      <div className="page-header">
        <h1>Destek Talepleri</h1>
        <Link to="/tickets/new" className="btn btn-primary">Yeni Talep</Link>
      </div>
      
      <div className="card">
        <div className="filters">
          <div className="form-group">
            <label>Durum</label>
            <select 
              className="form-control"
              value={filter.status}
              onChange={(e) => setFilter({...filter, status: e.target.value})}
            >
              <option value="">Tümü</option>
              <option value="open">Açık</option>
              <option value="in_progress">İşlemde</option>
              <option value="closed">Kapalı</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Öncelik</label>
            <select 
              className="form-control"
              value={filter.priority}
              onChange={(e) => setFilter({...filter, priority: e.target.value})}
            >
              <option value="">Tümü</option>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
              <option value="critical">Kritik</option>
            </select>
          </div>
        </div>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
        {filteredTickets.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Talep No</th>
                <th>Başlık</th>
                <th>Birim</th>
                <th>Durum</th>
                <th>Öncelik</th>
                <th>Kişiye Özel</th>
                <th>Özel Talep Durumu</th>
                <th>Tarih</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(ticket => (
                <tr key={ticket.id}>
                  <td>#{ticket.id}</td>
                  <td>{ticket.title}</td>
                  <td>
                    <span className="badge badge-secondary">
                      {ticket.department?.name || 'Bilinmeyen'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${
                      ticket.status === 'open' ? 'primary' : 
                      ticket.status === 'in_progress' ? 'warning' : 'success'
                    }`}>
                      {ticket.status === 'open' ? 'Açık' : 
                      ticket.status === 'in_progress' ? 'İşlemde' : 'Kapalı'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${
                      ticket.priority === 'high' || ticket.priority === 'critical' ? 'danger' :
                      ticket.priority === 'medium' ? 'warning' : 'primary'
                    }`}>
                      {ticket.priority === 'low' ? 'Düşük' :
                      ticket.priority === 'medium' ? 'Orta' :
                      ticket.priority === 'high' ? 'Yüksek' : 'Kritik'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${
                      ticket.is_personal ? 'info' : 'secondary'
                    }`}>
                      {ticket.is_personal ? 'Kişisel' : 'Birim'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${
                      ticket.is_private ? 'danger' : 'success'
                    }`}>
                      {ticket.is_private ? 'Özel' : 'Genel'}
                    </span>
                  </td>
                  <td>{new Date(ticket.created_at).toLocaleString()}</td>
                  <td>
                    <Link to={`/tickets/${ticket.id}`} className="btn btn-secondary btn-sm">Görüntüle</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>Bu kriterlere uygun destek talebi bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketList;
