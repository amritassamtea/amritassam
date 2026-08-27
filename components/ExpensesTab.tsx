import React, { useState, useMemo } from 'react';
import { 
  Receipt, PlusCircle, Search, Download, CheckCircle, Clock, 
  Paperclip, FileCheck, Eye, Edit, Trash2 
} from 'lucide-react';
import { ExpenseRecord } from '../types';

interface ExpensesTabProps {
  expenses: ExpenseRecord[];
  onAddExpense: () => void;
  onEditExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (id: string) => void;
  onViewBill: (bill: { url: string; poNumber: string; supplierName: string }) => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  expenses = [],
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onViewBill
}) => {
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('ALL');
  const [expenseFromDate, setExpenseFromDate] = useState('');
  const [expenseToDate, setExpenseToDate] = useState('');

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const q = expenseSearch.toLowerCase().trim();
      const matchesQuery = !q || 
        exp.title?.toLowerCase().includes(q) || 
        exp.expenseNumber?.toLowerCase().includes(q) || 
        exp.paidTo?.toLowerCase().includes(q) || 
        exp.billRefNumber?.toLowerCase().includes(q) ||
        exp.notes?.toLowerCase().includes(q);

      const matchesCat = expenseCategoryFilter === 'ALL' || exp.category === expenseCategoryFilter;
      const matchesStatus = expenseStatusFilter === 'ALL' || exp.status === expenseStatusFilter;

      let matchesDate = true;
      if (expenseFromDate && exp.date < expenseFromDate) matchesDate = false;
      if (expenseToDate && exp.date > expenseToDate) matchesDate = false;

      return matchesQuery && matchesCat && matchesStatus && matchesDate;
    });
  }, [expenses, expenseSearch, expenseCategoryFilter, expenseStatusFilter, expenseFromDate, expenseToDate]);

  const exportExpensesToCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('No expense records to export.');
      return;
    }
    const headers = ['Expense Number', 'Date', 'Category', 'Title', 'Amount (INR)', 'Payment Method', 'Paid To / Payee', 'Status', 'Bill Ref Number', 'Has Bill Document', 'Notes'];
    const rows = filteredExpenses.map(e => [
      e.expenseNumber,
      e.date,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      e.amount,
      e.paymentMethod,
      `"${(e.paidTo || '').replace(/"/g, '""')}"`,
      e.status,
      `"${(e.billRefNumber || '').replace(/"/g, '""')}"`,
      e.billUrl ? 'YES' : 'NO',
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AmritAssam_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalExpenseSum = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const paidExpenseSum = useMemo(() => {
    return expenses
      .filter(e => e.status === 'Paid' || e.status === 'Reimbursed')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const pendingExpenseSum = useMemo(() => {
    return expenses
      .filter(e => e.status === 'Pending')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const billsAttachedCount = useMemo(() => {
    return expenses.filter(e => !!e.billUrl).length;
  }, [expenses]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-tea-dark flex items-center gap-2">
            <Receipt className="text-amber-600" /> Miscellaneous Expenses & Office Bills
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track daily operating costs, packaging materials, factory conveyance, and uploaded bill vouchers.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={exportExpensesToCSV}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-4 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-1.5 shadow-sm"
            title="Export filtered expenses to CSV spreadsheet"
          >
            <Download size={16} /> Export CSV
          </button>
          <button 
            onClick={onAddExpense}
            className="bg-tea-dark hover:bg-black text-white px-5 py-2.5 rounded-lg font-bold shadow transition flex items-center gap-2"
          >
            <PlusCircle size={18} /> Record New Expense
          </button>
        </div>
      </div>

      {/* Expense Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Expenses</p>
            <p className="text-2xl font-black text-tea-dark mt-1">
              ₹{totalExpenseSum.toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{expenses.length} vouchers recorded</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
            <Receipt className="text-amber-600" size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Paid & Settled</p>
            <p className="text-2xl font-black text-green-700 mt-1">
              ₹{paidExpenseSum.toLocaleString()}
            </p>
            <p className="text-[11px] text-green-600 font-medium mt-0.5">Cleared via Bank/Cash</p>
          </div>
          <div className="bg-green-50 p-3 rounded-xl border border-green-100">
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pending Settlement</p>
            <p className="text-2xl font-black text-amber-700 mt-1">
              ₹{pendingExpenseSum.toLocaleString()}
            </p>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">
              {expenses.filter(e => e.status === 'Pending').length} pending approval
            </p>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
            <Clock className="text-amber-600" size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Bills Attached</p>
            <p className="text-2xl font-black text-blue-700 mt-1">
              {billsAttachedCount} / {expenses.length}
            </p>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">Verified with doc proof</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
            <Paperclip className="text-blue-600" size={24} />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search expense #, title, payee, or bill ref..."
              value={expenseSearch}
              onChange={e => setExpenseSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-xs outline-none focus:border-tea-green bg-gray-50 focus:bg-white transition"
            />
          </div>

          <div>
            <select
              value={expenseCategoryFilter}
              onChange={e => setExpenseCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-tea-green bg-gray-50 font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="Logistics & Delivery">Logistics & Delivery</option>
              <option value="Packaging & Corrugated">Packaging & Corrugated</option>
              <option value="Factory Operations">Factory Operations</option>
              <option value="Raw Materials & Agro">Raw Materials & Agro</option>
              <option value="Office & Admin">Office & Admin</option>
              <option value="Travel & Conveyance">Travel & Conveyance</option>
              <option value="Marketing & Promotion">Marketing & Promotion</option>
              <option value="Tea Tasting & Sampling">Tea Tasting & Sampling</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div>
            <select
              value={expenseStatusFilter}
              onChange={e => setExpenseStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-tea-green bg-gray-50 font-medium"
            >
              <option value="ALL">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Reimbursed">Reimbursed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <input 
              type="date"
              value={expenseFromDate}
              onChange={e => setExpenseFromDate(e.target.value)}
              className="w-1/2 px-2 py-2 border rounded-lg text-[11px] outline-none focus:border-tea-green bg-gray-50"
              title="From Date"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input 
              type="date"
              value={expenseToDate}
              onChange={e => setExpenseToDate(e.target.value)}
              className="w-1/2 px-2 py-2 border rounded-lg text-[11px] outline-none focus:border-tea-green bg-gray-50"
              title="To Date"
            />
          </div>
        </div>

        {(expenseSearch || expenseCategoryFilter !== 'ALL' || expenseStatusFilter !== 'ALL' || expenseFromDate || expenseToDate) && (
          <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-500">
            <span>Showing <strong>{filteredExpenses.length}</strong> of {expenses.length} expense records</span>
            <button
              onClick={() => {
                setExpenseSearch('');
                setExpenseCategoryFilter('ALL');
                setExpenseStatusFilter('ALL');
                setExpenseFromDate('');
                setExpenseToDate('');
              }}
              className="text-tea-dark hover:underline font-bold"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-sm">
          <Receipt size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="font-bold text-gray-700 text-lg">No Expense Records Found</h3>
          <p className="text-gray-500 text-xs mt-1 mb-4 max-w-md mx-auto">
            {expenses.length === 0 
              ? "Keep your miscellaneous, factory, tea tasting, and office expenditure organized with attached bills."
              : "No expense records match the active search or category filters. Try clearing your filters."}
          </p>
          <button
            onClick={onAddExpense}
            className="bg-tea-dark hover:bg-black text-white px-5 py-2.5 rounded-lg text-sm font-bold transition inline-flex items-center gap-2 shadow"
          >
            <PlusCircle size={16} /> Record First Expense
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((exp) => (
            <div key={exp.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-bold text-sm bg-gray-100 text-tea-dark px-3 py-1 rounded-lg border border-gray-200">
                    {exp.expenseNumber}
                  </span>
                  <span className="bg-amber-100 text-amber-900 font-bold text-xs px-2.5 py-1 rounded-full border border-amber-200">
                    {exp.category}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                    exp.status === 'Paid' ? 'bg-green-100 text-green-800 border border-green-200' :
                    exp.status === 'Reimbursed' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                    'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {exp.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Date: <strong className="text-gray-800">{exp.date}</strong></span>
                  <span>•</span>
                  <span>Method: <strong className="text-gray-800">{exp.paymentMethod}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-bold text-gray-900 text-base">{exp.title}</h4>
                  {exp.notes && (
                    <p className="text-xs text-gray-600 mt-1 italic bg-gray-50 p-2 rounded border border-gray-100">
                      "{exp.notes}"
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Paid To / Payee: <strong className="text-gray-900">{exp.paidTo}</strong>
                  </p>
                  {exp.billRefNumber && (
                    <p className="text-xs text-gray-500">
                      Bill / Voucher Ref: <strong className="font-mono text-gray-800">{exp.billRefNumber}</strong>
                    </p>
                  )}
                </div>

                {/* Bill Document Attachment Card */}
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <Paperclip size={14} className="text-tea-dark" /> Bill Attachment
                    </p>
                    {exp.billUrl ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200">
                          <FileCheck size={16} className="text-green-600 shrink-0" />
                          <span className="font-semibold truncate">Bill Document Attached</span>
                        </div>
                        <button
                          onClick={() => onViewBill({ url: exp.billUrl!, poNumber: exp.expenseNumber, supplierName: exp.paidTo })}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-1.5 px-3 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Eye size={14} /> View / Download Bill
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 bg-white p-3 rounded border border-dashed border-gray-300 text-center">
                        <span>No bill document uploaded</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount & Management Actions */}
                <div className="flex flex-col justify-between items-start md:items-end">
                  <div className="text-left md:text-right">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block">Expense Amount</span>
                    <span className="text-3xl font-black text-tea-dark">₹{exp.amount?.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t md:border-t-0 w-full md:w-auto justify-end">
                    <button
                      onClick={() => onEditExpense(exp)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete expense record ${exp.expenseNumber}?`)) {
                          onDeleteExpense(exp.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition"
                      title="Delete Expense"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
