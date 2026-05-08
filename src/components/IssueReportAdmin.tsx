import React, { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, Clock, User, BookOpen, RefreshCcw, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IssueReport {
  id: string;
  student_id: string;
  issue_type: string;
  description: string;
  created_at: string;
  students?: {
    name: string;
    class_name: string;
  };
}

export default function IssueReportAdmin() {
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_issue_reports')
        .select('*, students(name, class_name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm("Delete this report?")) return;
    try {
      const { error } = await supabase
        .from('test_issue_reports')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setReports(reports.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete report.');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading reports...</div>;

  const filteredReports = reports.filter(r => 
    r.students?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.issue_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-red-50 rounded-t-lg">
        <h2 className="text-lg font-bold text-red-800 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          Student Technical Issue Reports
        </h2>
        <button 
          onClick={fetchReports}
          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
          title="Refresh List"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search reports by student, type or description..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="border border-gray-100 rounded-xl p-5 hover:border-red-200 transition-all bg-white shadow-sm relative group">
              <button 
                onClick={() => handleDeleteReport(report.id)}
                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold shrink-0">
                  {report.students?.name.charAt(0)}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{report.students?.name}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      {report.students?.class_name}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                      report.issue_type.includes('Submission') ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {report.issue_type}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 text-sm mt-2 leading-relaxed">
                    {report.description}
                  </p>
                  
                  <div className="mt-4 flex items-center gap-4 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(report.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      ID: {report.student_id.split('-')[0]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredReports.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
              <ShieldAlert className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No issue reports found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
