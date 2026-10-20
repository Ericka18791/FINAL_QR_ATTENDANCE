import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { registerAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';

const CAMPUS_IMAGE = require('../../assets/images/campus-background.jpg');

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { user } = useAuth();
  const busyRef = useRef(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (busyRef.current) return;

    busyRef.current = true;
    setScanned(true);
    setProcessing(true);
    setLastData(data);
    setMessage(null);
    setSuccess(false);

    try {
      if (!user?.id) {
        setMessage('Please log in before recording attendance.');
        setSuccess(false);
        return;
      }

      const result = await registerAttendance(data, user.id);

      setMessage(result.message);
      setSuccess(result.success);
    } catch (error) {
      console.error('Attendance registration failed:', error);
      setMessage('Unable to record attendance. Please try scanning again.');
      setSuccess(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleScanAgain = () => {
    busyRef.current = false;
    setScanned(false);
    setProcessing(false);
    setLastData(null);
    setMessage(null);
    setSuccess(false);
  };

  if (!permission) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Preparing camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <ImageBackground
        source={CAMPUS_IMAGE}
        style={styles.permissionContainer}
        resizeMode="cover"
      >
        <BlurView
          intensity={35}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />

        <View
          pointerEvents="none"
          style={styles.permissionTint}
        />

        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Text style={styles.permissionEmoji}>▦</Text>
          </View>

          <Text style={styles.permissionTitle}>
            Camera Permission Needed
          </Text>

          <Text style={styles.permissionSubtitle}>
            Allow camera access to scan QR codes for your school events.
          </Text>

          <AppButton
            theme="primary"
            title="Grant Permission"
            icon="camera"
            onPress={requestPermission}
          />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={CAMPUS_IMAGE}
      style={styles.container}
      resizeMode="cover"
    >
      <BlurView
        intensity={45}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
      />

      <View
        pointerEvents="none"
        style={styles.backgroundTint}
      />

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerEmoji}>▦</Text>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Scan Attendance</Text>
          <Text style={styles.headerSubtitle}>CCTC School Events</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            scanned &&
              (success ? styles.statusSuccess : styles.statusError),
          ]}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.statusDot} />
          )}

          <Text style={styles.statusText}>
            {processing
              ? 'Processing'
              : scanned
                ? success
                  ? 'Recorded'
                  : 'Scanned'
                : 'Ready'}
          </Text>
        </View>
      </View>

      <View style={styles.scannerArea}>
        <View style={styles.scannerFrame}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={
              scanned ? undefined : handleBarcodeScanned
            }
          />

          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          {scanned && !processing && (
            <View style={styles.detectedMark}>
              <Text style={styles.detectedMarkText}>
                {success ? '✓' : '!'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.frameCaption}>
          {processing
            ? 'Recording attendance...'
            : scanned
              ? 'QR code detected'
              : 'Align the QR code inside the frame'}
        </Text>
      </View>

      <View style={styles.bottomCard}>
        <View style={styles.cardHeading}>
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>
              {processing ? '…' : scanned ? (success ? '✓' : '!') : '▦'}
            </Text>
          </View>

          <View style={styles.cardHeadingText}>
            <Text style={styles.cardTitle}>
              {processing
                ? 'Recording attendance...'
                : scanned
                  ? success
                    ? 'Attendance recorded!'
                    : 'Scan result'
                  : 'Ready to scan?'}
            </Text>

            <Text style={styles.cardSubtitle}>
              {processing
                ? 'Please wait while we process your attendance.'
                : scanned
                  ? 'Check the result below.'
                  : 'Position the event QR code inside the frame.'}
            </Text>
          </View>
        </View>

        {scanned && message && (
          <View
            style={[
              styles.resultBox,
              success ? styles.successBox : styles.errorBox,
            ]}
          >
            <Text
              style={[
                styles.scanResult,
                success ? styles.successText : styles.errorText,
              ]}
            >
              {message}
            </Text>
          </View>
        )}

        {scanned && lastData && (
          <Text
            style={styles.scanData}
            numberOfLines={2}
            ellipsizeMode="middle"
          >
            QR data: {lastData}
          </Text>
        )}

        {scanned && !processing && (
          <View style={styles.buttonContainer}>
            <AppButton
              theme="primary"
              title="Scan Again"
              icon="refresh"
              onPress={handleScanAgain}
            />
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101D30',
  },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.background,
  },

  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#101D30',
  },

  permissionTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,25,48,0.35)',
  },

  permissionCard: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  permissionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },

  permissionEmoji: {
    fontSize: 30,
    color: COLORS.primary,
    fontWeight: '800',
  },

  permissionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },

  permissionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },

  backgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,25,48,0.48)',
  },

  header: {
    position: 'absolute',
    top: 58,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 2,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  headerEmoji: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#E0EAF6',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  statusSuccess: {
    backgroundColor: 'rgba(30,130,80,0.85)',
  },

  statusError: {
    backgroundColor: 'rgba(179,38,30,0.85)',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A8F0BD',
  },

  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  scannerArea: {
    position: 'absolute',
    top: '23%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },

  scannerFrame: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101D30',
    overflow: 'hidden',
    borderRadius: 16,
  },

  corner: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderColor: '#B8D9FF',
    zIndex: 2,
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 16,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 16,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 16,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 16,
  },

  detectedMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },

  detectedMarkText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1B5E9C',
  },

  frameCaption: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },

  bottomCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 94,
    padding: 17,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    zIndex: 2,
  },

  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardIconText: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.primary,
  },

  cardHeadingText: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },

  resultBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
  },

  successBox: {
    backgroundColor: '#E7F4EC',
  },

  errorBox: {
    backgroundColor: '#FBEAE9',
  },

  scanResult: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '600',
  },

  successText: {
    color: '#1B5E3A',
  },

  errorText: {
    color: '#B3261E',
  },

  scanData: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },

  buttonContainer: {
    marginTop: 14,
  },
});
