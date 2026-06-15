import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useOfficerCollectionsSync } from '@/hooks/officer/useOfficerCollectionsSync';
import {
  AssignedCustomersScreen,
  CashCollectionScreen,
  CustomerPaymentHistoryScreen,
  OfficerCollectionHistoryScreen,
  OfficerCollectionScreen,
} from '@/screens/officer/payments';
import { ApplyLeaveScreen } from '@/screens/officer/leave/ApplyLeaveScreen';
import { OfficerLeaveScreen } from '@/screens/officer/OfficerLeaveScreen';
import { OfficerRequestsScreen } from '@/screens/officer/OfficerRequestsScreen';
import { OfficerChangePasswordScreen } from '@/screens/officer/profile/OfficerChangePasswordScreen';
import { OfficerProfileScreen } from '@/screens/officer/profile/OfficerProfileScreen';
import type {
  OfficerCollectionsStackParamList,
  OfficerLeaveStackParamList,
  OfficerProfileStackParamList,
  OfficerRequestsStackParamList,
} from '@/types/navigation';
import { colors } from '@/theme/colors';

const RequestsStack = createNativeStackNavigator<OfficerRequestsStackParamList>();
const CollectionsStack = createNativeStackNavigator<OfficerCollectionsStackParamList>();
const ProfileStack = createNativeStackNavigator<OfficerProfileStackParamList>();
const LeaveStack = createNativeStackNavigator<OfficerLeaveStackParamList>();

const OFFICER_HEADER_PURPLE = '#5B4FE9';

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
        options={{ title: 'My Requests' }}
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
        options={{ title: 'Collect cash' }}
      />
      <CollectionsStack.Screen
        name="CollectionHistory"
        component={OfficerCollectionHistoryScreen}
        options={{ title: 'Collection history' }}
      />
    </CollectionsStack.Navigator>
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
    </ProfileStack.Navigator>
  );
}
