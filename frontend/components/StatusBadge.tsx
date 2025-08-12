interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge = ({ status, className = '' }: StatusBadgeProps) => {
  const getStatusStyles = (status: string) => {
    switch (status.toUpperCase()) {
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'PENDING_DOCUMENTS':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'IN_REVIEW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'APPOINTMENT_SCHEDULED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'MISSING':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'UPLOADED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'VERIFIED':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatStatus = (status: string) => {
    return status
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(status)} ${className}`}
    >
      {formatStatus(status)}
    </span>
  );
};

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar = ({ progress, label, showPercentage = true, className = '' }: ProgressBarProps) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-500">{clampedProgress}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};