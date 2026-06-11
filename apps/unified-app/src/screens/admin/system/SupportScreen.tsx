import { Screen } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import { ChatbotScreen } from '@/screens/customer/ChatbotScreen';

export function AdminSupportScreen() {
  return (
    <RoleGuard requiredPermission="settings.view">
      <ChatbotScreen />
    </RoleGuard>
  );
}
