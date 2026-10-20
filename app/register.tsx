import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
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

import { signUp } from '@/lib/auth';

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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    Keyboard.dismiss();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp(email.trim(), password, {
        full_name: fullName.trim(),
        role: 'student',
      });

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
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
                  <Text style={styles.brandName}>CONSOLACION COLLEGE</Text>
                  <Text style={styles.brandName}>TOLEDO CITY</Text>
                </View>
              </View>

              <Text style={styles.brandSlogan}>
                Learn{'\n'}Grow{'\n'}Achieve
              </Text>
            </View>

            {/* Glass-style registration panel. */}
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

              <Text style={styles.appTitle}>
                {success ? 'Check your email' : 'Create Account'}
              </Text>

              <Text style={styles.subtitle}>
                {success
                  ? `We sent a confirmation link to ${email}.`
                  : 'Register to start recording attendance'}
              </Text>

              {success ? (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>
                    Click the link in your email to verify your account, then
                    come back and sign in.
                  </Text>

                  <Link href="/login" asChild>
                    <TouchableOpacity
                      style={styles.loginButton}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                    >
                      <View style={styles.loginButtonContent}>
                        <Text style={styles.loginArrow} accessible={false}>
                          →
                        </Text>
                        <Text style={styles.loginButtonText}>
                          Back to Sign In
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Link>
                </View>
              ) : (
                <>
                  {/* Full name */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon} accessible={false}>
                      ♙
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="Your full name"
                      placeholderTextColor="#718078"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                      editable={!loading}
                      returnKeyType="next"
                      accessibilityLabel="Full name"
                    />
                  </View>

                  {/* Email */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon} accessible={false}>
                      ✉
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="your.email@school.edu"
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
                      accessibilityLabel="Email"
                    />
                  </View>

                  {/* Password */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon} accessible={false}>
                      ▣
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="At least 6 characters"
                      placeholderTextColor="#718078"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      editable={!loading}
                      returnKeyType="next"
                      accessibilityLabel="Password"
                    />

                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
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

                  {/* Confirm password */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon} accessible={false}>
                      ▣
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter your password"
                      placeholderTextColor="#718078"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      editable={!loading}
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
                      accessibilityLabel="Confirm password"
                    />
                  </View>

                  {error ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.loginButton,
                      loading && styles.loginButtonDisabled,
                    ]}
                    onPress={handleRegister}
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
                        <Text style={styles.loginButtonText}>Sign Up</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.orRow}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.orLine} />
                  </View>

                  <Link href="/login" asChild>
                    <TouchableOpacity
                      style={styles.createAccountButton}
                      disabled={loading}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                    >
                      <Text style={styles.createAccountIcon} accessible={false}>
                        ♙
                      </Text>
                      <Text style={styles.createAccountText}>
                        Back to Sign In
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </>
              )}

              <View style={styles.cardMottoRow}>
                <Text style={styles.cardMotto}>
                  Better attendance{'\n'}for a brighter future
                </Text>

                <Text style={styles.leafDecoration} accessible={false}>
                  ❧
                </Text>
              </View>
            </View>

            {/* Bottom wave-inspired secure footer. */}
            <View style={styles.waveFooter}>
              <View style={styles.footerLine} />
              <Text style={styles.footerShield} accessible={false}>
                ◇
              </Text>
              <Text style={styles.footerText}>Secure registration</Text>
              <View style={styles.footerLine} />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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

  successBox: {
    marginTop: 4,
  },
  successText: {
    color: '#64776A',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
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
