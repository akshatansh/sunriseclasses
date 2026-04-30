import React from 'react';
import { X, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  testNumber: number;
  date: string;
  percentage: number;
}

interface Props {
  studentName: string;
  data: ChartData[];
  onClose: () => void;
}

const StudentProgressChart: React.FC<Props> = ({ studentName, data, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#06162f]/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl rounded-[2rem] bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8fbff] text-[#f5a623] shadow-inner border border-slate-100">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0f2a5c]">Progress Tracker</h2>
            <p className="text-sm font-semibold text-slate-500">{studentName}'s Test Performance</p>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            Abhi koi test history nahi hai.
          </div>
        ) : (
          <div className="h-[300px] sm:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{
                  top: 5,
                  right: 20,
                  left: -20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickMargin={10}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(15,42,92,0.1)',
                    fontWeight: 'bold',
                    color: '#0f2a5c'
                  }}
                  itemStyle={{ color: '#f5a623' }}
                  formatter={(value: number) => [`${value}%`, 'Score']}
                  labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px', fontWeight: 'normal' }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#f5a623"
                  strokeWidth={4}
                  dot={{ r: 6, fill: '#fff', stroke: '#f5a623', strokeWidth: 3 }}
                  activeDot={{ r: 8, fill: '#0f2a5c', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProgressChart;
