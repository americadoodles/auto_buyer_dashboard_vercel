import { 
  LucideIcon,
  Download,
  Plus,
  Users,
  UserCheck,
  UserPlus,
  Activity,
  Eye,
  Edit,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Check,
  Settings,
  X,
  Trash2,
  User,
  Calendar,
  Briefcase,
  XCircle,
  DollarSign,
  Car,
  FileText
} from 'lucide-react';

interface IconProps {
  icon?: LucideIcon;
  name?: string;
  className?: string;
  size?: number;
}

const iconMap: Record<string, LucideIcon> = {
  'download': Download,
  'plus': Plus,
  'users': Users,
  'user-check': UserCheck,
  'user-plus': UserPlus,
  'activity': Activity,
  'eye': Eye,
  'edit': Edit,
  'phone': Phone,
  'mail': Mail,
  'check-circle': CheckCircle,
  'clock': Clock,
  'trending-up': TrendingUp,
  'alert-circle': AlertCircle,
  'check': Check,
  'settings': Settings,
  'x': X,
  'trash-2': Trash2,
  'user': User,
  'calendar': Calendar,
  'briefcase': Briefcase,
  'x-circle': XCircle,
  'dollar-sign': DollarSign,
  'car': Car,
  'file-text': FileText
};

export const Icon: React.FC<IconProps> = ({ 
  icon: IconComponent, 
  name,
  className = '', 
  size = 24 
}) => {
  const IconToRender = name ? iconMap[name] : IconComponent;
  
  if (!IconToRender) {
    console.warn(`Icon with name "${name}" not found`);
    return null;
  }
  
  return <IconToRender className={className} size={size} />;
};
