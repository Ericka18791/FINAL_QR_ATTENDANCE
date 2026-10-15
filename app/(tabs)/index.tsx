
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';

const HOME = {
  navy: '#06366D',
  cream: '#F7F6F2',
  white: '#FFFFFF',
  green: '#2E7D5B',
  muted: '#5D6B7A',
};

export default function Index() {
  return (
    <ImageBackground
      source={require('@/assets/images/cctc-background.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* SCHOOL BRAND */}
          <View style={styles.header}>
            <View style={styles.brand}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />

              <View>
                <Text style={styles.brandTitle}>CCTC</Text>
                <Text style={styles.brandSubtitle}>
                  QR ATTENDANCE
                </Text>
              </View>
            </View>

            <View style={styles.schoolBadge}>
              <Ionicons
                name="school-outline"
                size={23}
                color={HOME.green}
              />
            </View>
          </View>

          {/* CAMPUS PHOTO HERO */}
          <View style={styles.hero}>
            <Image
              source={require('@/assets/images/cctc-background.jpg')}
              style={styles.campusImage}
              resizeMode="cover"
            />

            <View style={styles.heroOverlay}>
              <View style={styles.heroTag}>
                <View style={styles.tagDot} />
                <Text style={styles.tagText}>
                  SCHOOL EVENT ATTENDANCE
                </Text>
              </View>

              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>
                  Welcome to{'\n'}your campus!
                </Text>

                <Text style={styles.heroDescription}>
                  Make every school event count. Scan your QR code
                  to record your attendance quickly and easily.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/scan')}
                style={({ pressed }) => [
                  styles.heroFooter,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.heroFooterText}>
                  YOUR CAMPUS. YOUR COMMUNITY.
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color={HOME.white}
                />
              </Pressable>
            </View>

            {/* CURVED BOTTOM */}
            <View pointerEvents="none" style={styles.wave}>
              <View style={styles.waveShape} />
            </View>
          </View>

          {/* WELCOME TITLE */}
          <View style={styles.welcome}>
            <View style={styles.overlapLogo}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.overlapLogoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.appTitle}>QR Attendance</Text>

            <Text style={styles.appSubtitle}>
              School Event Attendance
            </Text>

            <Text style={styles.welcomeDescription}>
              A simple and convenient way to record your attendance
              during school activities.
            </Text>
          </View>

          {/* QUICK CHECK-IN */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Check-in</Text>
            <Text style={styles.sectionSubtitle}>
              Your attendance, made simple.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan QR Code"
            onPress={() => router.push('/scan')}
            style={({ pressed }) => [
              styles.scanCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.scanIconBox}>
              <Ionicons
                name="qr-code-outline"
                size={31}
                color={HOME.green}
              />
            </View>

            <View style={styles.scanText}>
              <Text style={styles.scanTitle}>Scan QR Code</Text>
              <Text style={styles.scanDescription}>
                Record your school event attendance
              </Text>
            </View>

            <View style={styles.scanArrow}>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={HOME.white}
              />
            </View>
          </Pressable>

          {/* ATTENDANCE HISTORY */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <Text style={styles.sectionSubtitle}>
              Manage your attendance records.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Attendance History"
            onPress={() => router.push('/history')}
            style={({ pressed }) => [
              styles.historyCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.historyIconBox}>
              <Ionicons
                name="time-outline"
                size={28}
                color={HOME.green}
              />
            </View>

            <View style={styles.historyText}>
              <Text style={styles.historyTitle}>
                Attendance History
              </Text>

              <Text style={styles.historyDescription}>
                View your previous attendance records.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color={HOME.muted}
            />
          </Pressable>

          {/* CAMPUS EVENTS */}
          <View style={styles.eventsHeading}>
            <View style={styles.eventsHeadingText}>
              <Text style={styles.sectionTitle}>
                Campus Events
              </Text>

              <Text style={styles.sectionSubtitle}>
                Stay connected with school activities.
              </Text>
            </View>

            <View style={styles.calendarIcon}>
              <Ionicons
                name="calendar-outline"
                size={22}
                color={HOME.green}
              />
            </View>
          </View>

          <View style={styles.eventCard}>
            <View style={styles.eventIconBox}>
              <Ionicons
                name="school-outline"
                size={27}
                color={HOME.green}
              />
            </View>

            <View style={styles.eventText}>
              <Text style={styles.eventTitle}>
                School Activities
              </Text>

              <Text style={styles.eventDescription}>
                Check with your teacher for upcoming events and
                attendance QR codes.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/teacher')}
                style={({ pressed }) => [
                  styles.eventLink,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.eventLinkText}>
                  Explore events
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={HOME.green}
                />
              </Pressable>
            </View>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.footerLogo}
              resizeMode="contain"
            />

            <Text style={styles.footerText}>
              CCTC · CAMPUS ATTENDANCE
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  brandLogo: {
    width: 48,
    height: 48,
  },

  brandTitle: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1,
    color: HOME.navy,
  },

  brandSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: HOME.muted,
    marginTop: 3,
  },

  schoolBadge: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#E8F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    height: 255,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: HOME.navy,
    marginBottom: 0,
  },

  campusImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 19,
    paddingTop: 17,
    paddingBottom: 47,
    backgroundColor: 'rgba(4,35,72,0.58)',
    justifyContent: 'space-between',
  },

  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  tagDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#BFE5FF',
  },

  tagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: HOME.white,
  },

  heroText: {
    paddingBottom: 4,
  },

  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: HOME.white,
    marginBottom: 8,
  },

  heroDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#F2F7FC',
  },

  heroFooter: {
    minHeight: 36,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroFooterText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: HOME.white,
  },

  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 39,
    backgroundColor: 'transparent',
  },

  waveShape: {
    position: 'absolute',
    bottom: -20,
    left: -10,
    right: -10,
    height: 45,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    backgroundColor: 'rgba(247,246,242,0.95)',
  },

  welcome: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 25,
    marginTop: -4,
  },

  overlapLogo: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: HOME.white,
    borderWidth: 4,
    borderColor: HOME.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    marginBottom: 9,
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },

  overlapLogoImage: {
    width: 62,
    height: 62,
  },

  appTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: HOME.navy,
    textAlign: 'center',
  },

  appSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: HOME.green,
    marginTop: 4,
  },

  welcomeDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: HOME.muted,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 290,
  },

  sectionHeader: {
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },

  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HOME.green,
    borderRadius: 20,
    padding: 15,
    marginBottom: 27,
    minHeight: 92,
  },

  scanIconBox: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: HOME.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanText: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },

  scanTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HOME.white,
    marginBottom: 5,
  },

  scanDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: '#EDF5FF',
  },

  scanArrow: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 19,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 27,
    minHeight: 88,
  },

  historyIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#E8F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyText: {
    flex: 1,
    marginHorizontal: 13,
  },

  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },

  historyDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  eventsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  eventsHeadingText: {
    flex: 1,
  },

  calendarIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#E8F0EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    padding: 16,
  },

  eventIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#E8F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  eventText: {
    flex: 1,
  },

  eventTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  eventDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },

  eventLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
  },

  eventLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME.green,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 25,
  },

  footerLogo: {
    width: 20,
    height: 20,
  },

  footerText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.textSecondary,
  },

  pressed: {
    opacity: 0.82,
  },
});
