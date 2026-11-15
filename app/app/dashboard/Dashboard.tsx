'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, CreditCard, CalendarCheck, TrendingUp, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { useSelector } from "react-redux";

import { UserRole } from '@/types.ts';
import { RootState } from "@/store";
import { DashboardService } from "@/services";

const data = [
  { name: 'Mon', attendance: 45 },
  { name: 'Tue', attendance: 52 },
  { name: 'Wed', attendance: 48 },
  { name: 'Thu', attendance: 61 },
  { name: 'Fri', attendance: 55 },
  { name: 'Sat', attendance: 75 },
  { name: 'Sun', attendance: 30 },
];

const Dashboard: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const auth = useSelector((state: RootState) => state.auth);

  const fetchSummaries = async () => {
    await DashboardService.getSummaries();
  }

  useEffect(() => {
    setMounted(true);
    fetchSummaries();
  }, []);

  const isAdmin = auth.user?.role === UserRole.ADMIN || auth.user?.role === UserRole.COACH;

  if (!mounted) return null;

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <header>
          <h2 className="text-2xl font-bold text-slate-800">Your Progress</h2>
          <p className="text-slate-500">Keep up the great work!</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><CheckCircle2 /></div>
              <span className="text-2xl font-bold text-slate-800">6 / 8</span>
            </div>
            <p className="text-sm font-medium text-slate-500">Sessions Completed</p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Calendar /></div>
              <p className="text-sm font-bold text-slate-800">Sat, 10:00 AM</p>
            </div>
            <p className="text-sm font-medium text-slate-500">Next Class: MMA Beginner</p>
            <p className="text-xs text-slate-400 mt-2">Coach: Marcus Silva</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock /></div>
              <span className="text-sm font-bold text-amber-700">Active</span>
            </div>
            <p className="text-sm font-medium text-slate-500">Membership Status</p>
            <p className="text-xs text-slate-400 mt-2">Renews in 12 days</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Hub Overview</h2>
        <p className="text-slate-500">Welcome back, here's what's happening today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: '248', icon: <Users className="text-blue-600" />, trend: '+12%', color: 'bg-blue-50' },
          { label: 'Weekly Revenue', value: '$10,100', icon: <CreditCard className="text-blue-600" />, trend: '+5%', color: 'bg-blue-50' },
          { label: 'Avg Attendance', value: '88%', icon: <CalendarCheck className="text-amber-600" />, trend: '+2%', color: 'bg-amber-50' },
          { label: 'Active Coaches', value: '14', icon: <TrendingUp className="text-sky-600" />, trend: 'Stable', color: 'bg-sky-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{stat.trend}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold mb-6">Attendance Trends</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
              />
              <Bar dataKey="attendance" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm font-medium px-4">
        <p>© 2026 Akademi Futsal Kota Cirebon • @r_adam29</p>
      </div>
    </div>
  );
};

export default Dashboard;
