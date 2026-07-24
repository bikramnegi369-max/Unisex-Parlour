export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
          <p className="text-3xl font-bold mt-2">₹0</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Appointments Today</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Active Memberships</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
      </div>
      
      {/* Chart Placeholder */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 h-80 flex items-center justify-center">
        <p className="text-gray-400">Revenue Chart Module Coming Soon...</p>
      </div>
    </div>
  );
}
