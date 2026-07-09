import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useOfficerCollectionsSync } from '@/hooks/officer/useOfficerCollectionsSync';
import {
  AssignedCustomersScreen,
  CashCollectionScreen,
  CustomerPaymentHistoryScreen,
  OfficerCollectionHistoryScreen,
  OfficerCollectionScreen,
  OfficerRecordPaymentScreen,
} from '@/screens/officer/payments';
import { OfficerPortalNotificationsScreen } from '@/screens/officer/notifications/OfficerPortalNotificationsScreen';
import { ApplyLeaveScreen } from '@/screens/officer/leave/ApplyLeaveScreen';
import { OfficerLeaveScreen } from '@/screens/officer/OfficerLeaveScreen';
import { OfficerRequestsScreen } from '@/screens/officer/OfficerRequestsScreen';
import { OfficerChangePasswordScreen } from '@/screens/officer/profile/OfficerChangePasswordScreen';
import { OfficerEmploymentContractScreen } from '@/screens/officer/profile/OfficerEmploymentContractScreen';
import { OfficerProfileScreen } from '@/screens/officer/profile/OfficerProfileScreen';
import { ContractPdfViewerScreen } from '@/screens/common/ContractPdfViewerScreen';
import type {
  OfficerCollectionsStackParamList,
  OfficerLeaveStackParamList,
  OfficerNotificationsStackParamList,
  OfficerProfileStackParamList,
  OfficerRequestsStackParamList,
} from '@/types/navigation';
import { colors, officerColors } from '@/theme/colors';

const RequestsStack = createNativeStackNavigator<OfficerRequestsStackParamList>();
const CollectionsStack = createNativeStackNavigator<OfficerCollectionsStackParamList>();
const ProfileStack = createNativeStackNavigator<OfficerProfileStackParamList>();
const LeaveStack = createNativeStackNavigator<OfficerLeaveStackParamList>();
const NotificationsStack = createNativeStackNavigator<OfficerNotificationsStackParamList>();

const OFFICER_HEADER_PURPLE = officerColors.navBar;

const stackScreenOptions = {
  headerStyle: { backgroundColor: OFFICER_HEADER_PURPLE },
  headerTintColor: colors.white,
  headerTitleStyle: { fontSize: 20, fontWeight: '600' as const },
  headerShadowVisible: false,
};

export function OfficerRequestsStackNav() {
  return (
    <RequestsStack.Navigator screenOptions={stackScreenOptions}>
      <RequestsStack.Screen
        name="RequestsList"
        component={OfficerRequestsScreen}
        options={{ title: 'My Tickets' }}
      />
    </RequestsStack.Navigator>
  );
}

export function OfficerCollectionsStackNav() {
  useOfficerCollectionsSync();

  return (
    <CollectionsStack.Navigator screenOptions={stackScreenOptions}>
      <CollectionsStack.Screen
        name="CollectionsList"
        component={OfficerCollectionScreen}
        options={{ title: 'Collections' }}
      />
      <CollectionsStack.Screen
        name="AssignedCustomers"
        component={AssignedCustomersScreen}
        options={{ title: 'Collect Payment' }}
      />
      <CollectionsStack.Screen
        name="CustomerPaymentHistory"
        component={CustomerPaymentHistoryScreen}
        options={{ title: 'Payment history' }}
      />
      <CollectionsStack.Screen
        name="CashCollection"
        component={CashCollectionScreen}
        options={{ title: 'Collect Payment' }}
      />
      <CollectionsStack.Screen
        name="CollectionHistory"
        component={OfficerCollectionHistoryScreen}
        options={{ title: 'Collection history' }}
      />
      <CollectionsStack.Screen
        name="RecordPayment"
        component={OfficerRecordPaymentScreen}
        options={{ title: 'Record payment' }}
      />
    </CollectionsStack.Navigator>
  );
}

export function OfficerNotificationsStackNav() {
  return (
    <NotificationsStack.Navigator screenOptions={stackScreenOptions}>
      <NotificationsStack.Screen
        name="NotificationsList"
        component={OfficerPortalNotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </NotificationsStack.Navigator>
  );
}

export function OfficerLeaveStackNav() {
  return (
    <LeaveStack.Navigator screenOptions={stackScreenOptions}>
      <LeaveStack.Screen
        name="LeaveList"
        component={OfficerLeaveScreen}
        options={{ title: 'Leave' }}
      />
      <LeaveStack.Screen
        name="ApplyLeave"
        component={ApplyLeaveScreen}
        options={{ title: 'Apply for Leave' }}
      />
    </LeaveStack.Navigator>
  );
}

export function OfficerProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen
        name="ProfileHome"
        component={OfficerProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="ChangePassword"
        component={OfficerChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
      <ProfileStack.Screen
        name="EmploymentContract"
        component={OfficerEmploymentContractScreen}
        options={{ title: 'Employment Contract' }}
      />
      <ProfileStack.Screen
        name="ContractPdfViewer"
        component={ContractPdfViewerScreen}
        options={{ headerShown: false }}
      />
    </ProfileStack.Navigator>
  );
}

