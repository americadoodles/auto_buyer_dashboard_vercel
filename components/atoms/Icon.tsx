import React from 'react';
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
  FileText,
  MapPin,
  Sparkles,
  Loader2,
  MessageSquare,
  Send,
} from 'lucide-react';

// Import image icons
import AccuTradeIcon from '../../assets/images/icons/AccuTrade.png';
import AutoCheckIcon from '../../assets/images/icons/AutoCheck.png';
import CarfaxIcon from '../../assets/images/icons/Carfax.png';
import MMRIcon from '../../assets/images/icons/MMR.png';

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
  'file-text': FileText,
  'map-pin': MapPin,
  'sparkles': Sparkles,
  'loader': Loader2,
  'loader-2': Loader2,
  'message-square': MessageSquare,
  'send': Send,
};

// Helper function to get image source from StaticImageData or string
const getImageSrc = (img: string | { src?: string; [key: string]: any }): string => {
  if (typeof img === 'string') return img;
  return img.src || (img as any).default || '';
};

const imageIconMap: Record<string, string> = {
  'accutrade': getImageSrc(AccuTradeIcon),
  'autocheck': getImageSrc(AutoCheckIcon),
  'carfax': getImageSrc(CarfaxIcon),
  'mmr': getImageSrc(MMRIcon),
};

export const Icon: React.FC<IconProps> = ({ 
  icon: IconComponent, 
  name,
  className = '', 
  size = 24 
}) => {
  // Check if it's an image icon first
  if (name) {
    const imageIconSrc = imageIconMap[name.toLowerCase()];
    if (imageIconSrc) {
      return (
        <img
          src={imageIconSrc}
          alt={name}
          className={className}
          style={{ width: size, height: size }}
        />
      );
    }
  }

  // Otherwise, try Lucide icon
  const IconToRender = name ? iconMap[name] : IconComponent;
  
  if (!IconToRender) {
    console.warn(`Icon with name "${name}" not found`);
    return null;
  }
  
  return <IconToRender className={className} size={size} />;
};
