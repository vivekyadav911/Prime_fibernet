import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  CashCollectionScreen,
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

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.primaryNavy },
  headerTintColor: colors.white,
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
  return (
    <CollectionsStack.Navigator screenOptions={stackScreenOptions}>
      <CollectionsStack.Screen
        name="CollectionsList"
        component={OfficerCollectionScreen}
        options={{ title: 'Collections' }}
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
