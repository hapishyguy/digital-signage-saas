export default function EmptyState({ icon: Icon, text, sub }) {
  return (
    <div className="text-center py-16 bg-gray-900/50 rounded-xl border border-gray-800">
      <Icon size={48} className="mx-auto mb-4 text-gray-700" />
      <p className="text-gray-400 text-lg">{text}</p>
      {sub && <p className="text-gray-600 text-sm mt-1">{sub}</p>}
    </div>
  );
}
