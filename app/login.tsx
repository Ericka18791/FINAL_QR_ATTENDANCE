
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as LocalAuthentication from 'expo-local-authentication';

import { signIn } from '@/lib/auth';

function QrCornerMark() {
  return (
    <View style={styles.qrMark} pointerEvents="none" accessible={false}>
      <View style={[styles.qrCorner, styles.qrTopLeft]} />
      <View style={[styles.qrCorner, styles.qrTopRight]} />
      <View style={[styles.qrCorner, styles.qrBottomLeft]} />
      <View style={[styles.qrCorner, styles.qrBottomRight]} />
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scanning, setScanning] = useState(false);
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scanning) {
      scanLine.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [scanning, scanLine]);

  const handleLogin = async () => {
    Keyboard.dismiss();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      setScanning(true);
      await new Promise((resolve) => setTimeout(resolve, 1400));
      setScanning(false);

      if (Platform.OS === 'web') {
        setErrorMessage(
          'Biometric login can only be tested in the Android or iOS app.'
        );
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        setErrorMessage(
          'Biometric authentication is not available on this device.'
        );
        return;
      }

      if (!isEnrolled) {
        setErrorMessage(
          'Please register a fingerprint or other biometric in your phone settings.'
        );
        return;
      }

      const biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your fingerprint to continue',
        cancelLabel: 'Cancel',
        disableDeviceFallback: true,
      });

      if (!biometricResult.success) {
        setErrorMessage(
          biometricResult.error === 'user_cancel'
            ? 'Fingerprint verification was cancelled.'
            : 'Fingerprint verification failed. Please try again.'
        );
        return;
      }

      const { error: authError } = await signIn(email.trim(), password);

      if (authError) {
        setErrorMessage(
          authError.message || 'Unable to sign in. Please try again.'
        );
        return;
      }

      router.replace('/(tabs)');
    } catch {
      setErrorMessage(
        'Something went wrong. Please check your connection and try again.'
      );
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Modal
        visible={scanning}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setScanning(false)}
      >
        <View style={styles.scanBackdrop}>
          <View style={styles.scanCard}>
            <Text style={styles.scanTitle}>Fingerprint Verification</Text>
            <Text style={styles.scanSubtitle}>
              Preparing secure sign in...
            </Text>

            <View style={styles.fingerprintArea}>
              <Text style={styles.fingerprintGraphic} accessible={false}>
                🫆
              </Text>

              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanLine.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 112],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>

            <Text style={styles.scanHint}>Please wait</Text>
          </View>
        </View>
      </Modal>

      {/* Keep your existing campus background image. */}
      <ImageBackground
        source={require('../assets/images/campus-background.jpg')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        blurRadius={1}
      >
        <View style={styles.backgroundOverlay} />
      </ImageBackground>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: Math.max(insets.top, 14),
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* College branding from the reference design. */}
            <View style={styles.brandHeader}>
              <View style={styles.brandLeft}>
                <View style={styles.brandRule} />
                <View>
                  <Text style={styles.brandTitle}>QR ATTENDANCE</Text>
                  <Text style={styles.brandName}>
                    CONSOLACION COLLEGE
                  </Text>
                  <Text style={styles.brandName}>TOLEDO CITY</Text>
                </View>
              </View>

              <Text style={styles.brandSlogan}>
                Learn{'\n'}Grow{'\n'}Achieve
              </Text>
            </View>

            {/* Compact glass-style login panel. */}
            <View style={styles.card}>
              <QrCornerMark />

              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/images/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel="QR Attendance logo"
                />
              </View>

              <Text style={styles.appTitle}>QR Attendance</Text>

              <Text style={styles.subtitle}>
                Your campus. Your attendance.{'\n'}Simplified.
              </Text>

              {/* Email / student ID field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon} accessible={false}>
                  ✉
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Email or Student ID"
                  placeholderTextColor="#718078"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  editable={!loading}
                  returnKeyType="next"
                  accessibilityLabel="Email or Student ID"
                />
              </View>

              {/* Password field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon} accessible={false}>
                  ▣
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#718078"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  accessibilityLabel="Password"
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowPassword((previous) => !previous)
                  }
                  style={styles.passwordToggle}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  disabled={loading}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? '◉' : '◎'}
                  </Text>
                </TouchableOpacity>
              </View>

              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Primary sign-in action */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.loginButtonContent}>
                    <Text style={styles.loginArrow} accessible={false}>
                      →
                    </Text>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>

              {/* Secondary create-account action */}
              <Link href="/register" asChild>
                <TouchableOpacity
                  style={styles.createAccountButton}
                  disabled={loading}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Text
                    style={styles.createAccountIcon}
                    accessible={false}
                  >
                    ♙
                  </Text>
                  <Text style={styles.createAccountText}>
                    Create an Account
                  </Text>
                </TouchableOpacity>
              </Link>

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>
                  Don't have an account?{' '}
                </Text>

                <Link href="/register" asChild>
                  <TouchableOpacity
                    disabled={loading}
                    accessibilityRole="link"
                  >
                    <Text style={styles.registerLink}>Sign Up</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <View style={styles.cardMottoRow}>
                <Text style={styles.cardMotto}>
                  Better attendance{'\n'}for a brighter future
                </Text>

                <Text style={styles.leafDecoration} accessible={false}>
                  ❧
                </Text>
              </View>
            </View>

            {/* Bottom wave-inspired secure-login footer. */}
            <View style={styles.waveFooter}>
              <View style={styles.footerLine} />
              <Text style={styles.footerShield} accessible={false}>
                ◇
              </Text>
              <Text style={styles.footerText}>Secure login</Text>
              <View style={styles.footerLine} />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scanBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 20, 14, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scanCard: {
    width: '100%',
    maxWidth: 330,
    alignItems: 'center',
    backgroundColor: '#F9F7EE',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  scanTitle: {
    color: '#174D35',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  scanSubtitle: {
    color: '#64776A',
    fontSize: 13,
    marginTop: 7,
    textAlign: 'center',
  },
  fingerprintArea: {
    width: 150,
    height: 150,
    marginTop: 22,
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(32, 91, 64, 0.22)',
    backgroundColor: '#EAF1E9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fingerprintGraphic: {
    fontSize: 88,
    color: '#205B40',
  },
  scanLine: {
    position: 'absolute',
    top: 12,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#28A7F4',
    shadowColor: '#28A7F4',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 5,
  },
  scanHint: {
    color: '#205B40',
    fontSize: 13,
    fontWeight: '600',
  },
  screen: {
    flex: 1,
    backgroundColor: '#E8E8D8',
    overflow: 'hidden',
  },
  keyboardContainer: {
    flex: 1,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29, 58, 42, 0.13)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    rowGap: 14,
  },

  /* Top-left school name and top-right slogan. */
  brandHeader: {
    width: '100%',
    maxWidth: 560,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 58,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexShrink: 1,
  },
  brandRule: {
    width: 2,
    marginRight: 11,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 2.1,
    fontWeight: '700',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: 1.55,
    lineHeight: 14,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  brandSlogan: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontFamily: 'serif',
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 16,
    textAlign: 'right',
    transform: [{ rotate: '-7deg' }],
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* This is deliberately shorter and less padded than the original card. */
  card: {
    width: '94%',
    maxWidth: 440,
    alignSelf: 'center',
    position: 'relative',
    backgroundColor: 'rgba(250, 247, 235, 0.89)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#172D20',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 9,
  },
  qrMark: {
    position: 'absolute',
    top: 20,
    left: 19,
    width: 25,
    height: 25,
  },
  qrCorner: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderColor: '#245B40',
    borderWidth: 2,
  },
  qrTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  qrTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  qrBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  qrBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },

  /* Logo design change: transparent background, all other layout preserved. */
  logoContainer: {
    width: 74,
    height: 74,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'transparent',
    marginBottom: 7,
    overflow: 'hidden',
  },
  logo: {
    width: 68,
    height: 68,
  },
  appTitle: {
    fontFamily: 'serif',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: '#174D35',
    textAlign: 'center',
    letterSpacing: -0.35,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 18,
    color: '#64776A',
    textAlign: 'center',
  },

  /* Rounded, light input pills from the third reference. */
  inputContainer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(39, 87, 61, 0.42)',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 253, 246, 0.92)',
    paddingHorizontal: 13,
    marginBottom: 10,
  },
  inputIcon: {
    width: 23,
    marginRight: 8,
    textAlign: 'center',
    color: '#245B40',
    fontSize: 18,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: '#263B2E',
    fontSize: 14,
    paddingVertical: 10,
  },
  passwordToggle: {
    width: 28,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 7,
    marginLeft: 5,
  },
  eyeIcon: {
    color: '#547663',
    fontSize: 19,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 240, 238, 0.96)',
    borderWidth: 1,
    borderColor: '#E7B9B3',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#9F2822',
    fontSize: 12,
    lineHeight: 17,
  },
  loginButton: {
    minHeight: 50,
    backgroundColor: '#205B40',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    shadowColor: '#16442F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginArrow: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 28,
    marginRight: 10,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 11,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(43, 83, 61, 0.28)',
  },
  orText: {
    marginHorizontal: 10,
    color: '#6F8375',
    fontSize: 11,
    fontWeight: '500',
  },
  createAccountButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 92, 63, 0.68)',
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  createAccountIcon: {
    color: '#205B40',
    fontSize: 18,
    marginRight: 9,
  },
  createAccountText: {
    color: '#205B40',
    fontSize: 13,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 11,
  },
  registerText: {
    color: '#718078',
    fontSize: 11,
  },
  registerLink: {
    color: '#205B40',
    fontSize: 11,
    fontWeight: '800',
  },
  cardMottoRow: {
    minHeight: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 9,
    paddingLeft: 2,
  },
  cardMotto: {
    color: '#6B6554',
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 10,
    lineHeight: 12,
  },
  leafDecoration: {
    color: 'rgba(41, 104, 69, 0.34)',
    fontFamily: 'serif',
    fontSize: 45,
    lineHeight: 43,
    marginRight: 2,
    marginBottom: -7,
  },

  /* Simple curved green footer inspired by the bottom wave. */
  waveFooter: {
    width: '110%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#244C38',
    borderTopLeftRadius: 58,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
    marginTop: 1,
  },
  footerLine: {
    width: 26,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.65)',
    marginHorizontal: 10,
  },
  footerShield: {
    color: '#FFFFFF',
    fontSize: 18,
    marginRight: 7,
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 0.15,
  },
});