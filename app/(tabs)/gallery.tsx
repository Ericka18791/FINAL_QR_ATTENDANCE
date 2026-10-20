import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';


type GalleryPhoto = {
  uri: string;
  name: string;
  createdAt: number;
  album: string;
};

const FOLDER_NAME = 'campus-gallery';
const ALBUMS_KEY = '@qr_attendance_gallery_albums';
const METADATA_KEY = '@qr_attendance_gallery_metadata';

const THEME = {
  background: '#BFE2F8',
  backgroundLight: '#EAF6FF',
  white: '#FFFFFF',
  navy: '#0B2E59',
  navyLight: '#173F70',
  blue: '#DDEFFF',
  muted: '#647F9A',
  border: '#D9E9F7',
  danger: '#C43D4B',
};

const ALBUM_OPTIONS = [
  {
    id: 'all',
    title: 'All Photos',
    icon: 'images-outline' as const,
  },
  {
    id: 'School Events',
    title: 'School Events',
    icon: 'school-outline' as const,
  },
  {
    id: 'Campus Life',
    title: 'Campus Life',
    icon: 'business-outline' as const,
  },
  {
    id: 'Class Activities',
    title: 'Class Activities',
    icon: 'people-outline' as const,
  },
  {
    id: 'Other Memories',
    title: 'Other Memories',
    icon: 'heart-outline' as const,
  },
];

export default function GalleryScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const [loading, setLoading] = useState(true);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] =
    useState<GalleryPhoto | null>(null);
  const [activeAlbum, setActiveAlbum] = useState('all');
  const [captureAlbum, setCaptureAlbum] = useState('Campus Life');

  const getGalleryDirectory = useCallback(() => {
    const directory = FileSystem.documentDirectory;

    if (!directory) {
      throw new Error('App storage is unavailable.');
    }

    return `${directory}${FOLDER_NAME}/`;
  }, []);

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);

      const directory = getGalleryDirectory();

      await FileSystem.makeDirectoryAsync(directory, {
        intermediates: true,
      });

      const filenames = await FileSystem.readDirectoryAsync(directory);

      const savedNames = filenames
        .filter((name) => /\.(jpg|jpeg|png)$/i.test(name))
        .sort((a, b) => {
          const timeA = Number(a.match(/\d+/)?.[0] ?? 0);
          const timeB = Number(b.match(/\d+/)?.[0] ?? 0);
          return timeB - timeA;
        });

      const storedMetadata = await AsyncStorage.getItem(METADATA_KEY);
      const metadata: Record<string, string> = storedMetadata
        ? JSON.parse(storedMetadata)
        : {};

      const savedPhotos: GalleryPhoto[] = savedNames.map((name) => ({
        name,
        uri: `${directory}${name}`,
        createdAt: Number(name.match(/\d+/)?.[0] ?? 0),
        album: metadata[name] || 'Campus Life',
      }));

      setPhotos(savedPhotos);
    } catch (error) {
      console.error('Failed to load gallery photos:', error);

      Alert.alert(
        'Gallery unavailable',
        'We could not load your saved photos. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [getGalleryDirectory]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();

      if (!result.granted) {
        Alert.alert(
          'Camera permission needed',
          'Allow camera access to take photos inside the app.',
        );
        return;
      }
    }

    setCameraOpen(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current || takingPhoto) {
      return;
    }

    try {
      setTakingPhoto(true);

      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.9,
      });

      if (!picture?.uri) {
        throw new Error('The camera did not return a photo.');
      }

      const directory = getGalleryDirectory();

      await FileSystem.makeDirectoryAsync(directory, {
        intermediates: true,
      });

      const filename = `photo_${Date.now()}.jpg`;
      const destination = `${directory}${filename}`;

      await FileSystem.copyAsync({
        from: picture.uri,
        to: destination,
      });

      const storedMetadata = await AsyncStorage.getItem(METADATA_KEY);
      const metadata: Record<string, string> = storedMetadata
        ? JSON.parse(storedMetadata)
        : {};

      metadata[filename] = captureAlbum;

      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));

      setCameraOpen(false);
      await loadPhotos();

      Alert.alert(
        'Photo saved',
        `Your photo was saved to ${captureAlbum}.`,
      );
    } catch (error) {
      console.error('Failed to take or save photo:', error);

      Alert.alert(
        'Could not save photo',
        'Please try again. Make sure the app has camera permission.',
      );
    } finally {
      setTakingPhoto(false);
    }
  };

  const deletePhoto = (photo: GalleryPhoto) => {
    Alert.alert(
      'Delete photo?',
      'This photo will be permanently removed from this device’s Campus Gallery.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(photo.uri, {
                idempotent: true,
              });

              const storedMetadata = await AsyncStorage.getItem(METADATA_KEY);
              const metadata: Record<string, string> = storedMetadata
                ? JSON.parse(storedMetadata)
                : {};

              delete metadata[photo.name];

              await AsyncStorage.setItem(
                METADATA_KEY,
                JSON.stringify(metadata),
              );

              setSelectedPhoto(null);
              await loadPhotos();
            } catch (error) {
              console.error('Failed to delete photo:', error);

              Alert.alert(
                'Delete failed',
                'We could not delete this photo. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) {
      return 'Saved photo';
    }

    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredPhotos =
    activeAlbum === 'all'
      ? photos
      : photos.filter((photo) => photo.album === activeAlbum);

  const getAlbumCount = (albumId: string) => {
    if (albumId === 'all') {
      return photos.length;
    }

    return photos.filter((photo) => photo.album === albumId).length;
  };

  if (cameraOpen) {
    return (
      <SafeAreaView style={styles.cameraScreen}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.navy} />

        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraFacing}
        >
          <View style={styles.cameraHeader}>
            <Pressable
              style={styles.cameraIconButton}
              onPress={() => setCameraOpen(false)}
              accessibilityLabel="Close camera"
            >
              <Ionicons name="close" size={26} color={THEME.white} />
            </Pressable>

            <View style={styles.cameraHeading}>
              <Text style={styles.cameraTitle}>Capture a Memory</Text>
              <Text style={styles.cameraSubtitle}>
                Saving to {captureAlbum}
              </Text>
            </View>

            <Pressable
              style={styles.cameraIconButton}
              onPress={() =>
                setCameraFacing((current) =>
                  current === 'back' ? 'front' : 'back',
                )
              }
              disabled={takingPhoto}
              accessibilityLabel="Switch camera"
            >
              <Ionicons
                name="camera-reverse-outline"
                size={25}
                color={THEME.white}
              />
            </Pressable>
          </View>

          <View style={styles.cameraBottom}>
            <Text style={styles.cameraHint}>
              Your memories stay inside this app.
            </Text>

            <Pressable
              style={[
                styles.shutterOuter,
                takingPhoto && styles.disabledButton,
              ]}
              onPress={() => void takePhoto()}
              disabled={takingPhoto}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
            >
              <View style={styles.shutterInner}>
                {takingPhoto ? (
                  <ActivityIndicator color={THEME.navy} />
                ) : null}
              </View>
            </Pressable>
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="images-outline"
              size={28}
              color={THEME.navy}
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>YOUR SCHOOL MEMORIES</Text>
            <Text style={styles.title}>Campus Gallery</Text>
            <Text style={styles.subtitle}>
              Every moment has a place.
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={() => void loadPhotos()}
            accessibilityRole="button"
            accessibilityLabel="Refresh gallery"
          >
            <Ionicons
              name="refresh-outline"
              size={22}
              color={THEME.navy}
            />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTextArea}>
            <View style={styles.heroBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={THEME.navy}
              />
              <Text style={styles.heroBadgeText}>PRIVATE COLLECTION</Text>
            </View>

            <Text style={styles.heroTitle}>Memories made on campus.</Text>

            <Text style={styles.heroDescription}>
              Keep your school activities, events, and favorite moments
              organized in one place.
            </Text>

            <Pressable
              style={styles.heroButton}
              onPress={() => void openCamera()}
              accessibilityRole="button"
            >
              <Ionicons name="camera-outline" size={20} color={THEME.white} />
              <Text style={styles.heroButtonText}>Take a Photo</Text>
            </Pressable>
          </View>

          <View style={styles.heroDecoration}>
            <Ionicons
              name="images"
              size={65}
              color="rgba(255,255,255,0.92)"
            />
            <View style={styles.heroSmallDecoration}>
              <Ionicons
                name="sparkles"
                size={20}
                color={THEME.navy}
              />
            </View>
          </View>
        </View>

        <View style={styles.privacyStrip}>
          <View style={styles.privacyIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={THEME.navy}
            />
          </View>

          <View style={styles.privacyText}>
            <Text style={styles.privacyTitle}>Your photos stay private</Text>
            <Text style={styles.privacyDescription}>
              Stored locally on this device, not in your public phone gallery.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Your Albums</Text>
            <Text style={styles.sectionSubtitle}>
              Choose a collection to explore
            </Text>
          </View>
          <View style={styles.totalCount}>
            <Text style={styles.totalCountNumber}>{photos.length}</Text>
            <Text style={styles.totalCountLabel}>
              {photos.length === 1 ? 'PHOTO' : 'PHOTOS'}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.albumList}
        >
          {ALBUM_OPTIONS.map((album) => {
            const isActive = activeAlbum === album.id;
            const count = getAlbumCount(album.id);

            return (
              <Pressable
                key={album.id}
                style={[
                  styles.albumCard,
                  isActive && styles.albumCardActive,
                ]}
                onPress={() => setActiveAlbum(album.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <View
                  style={[
                    styles.albumIcon,
                    isActive && styles.albumIconActive,
                  ]}
                >
                  <Ionicons
                    name={album.icon}
                    size={22}
                    color={isActive ? THEME.white : THEME.navy}
                  />
                </View>

                <Text
                  style={[
                    styles.albumTitle,
                    isActive && styles.albumTitleActive,
                  ]}
                  numberOfLines={2}
                >
                  {album.title}
                </Text>

                <Text
                  style={[
                    styles.albumCount,
                    isActive && styles.albumCountActive,
                  ]}
                >
                  {count} {count === 1 ? 'photo' : 'photos'}
                </Text>

                {isActive ? (
                  <View style={styles.activeAlbumMark} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.galleryHeading}>
          <View>
            <Text style={styles.sectionTitle}>
              {ALBUM_OPTIONS.find((album) => album.id === activeAlbum)?.title}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {filteredPhotos.length === 1
                ? '1 memory saved'
                : `${filteredPhotos.length} memories saved`}
            </Text>
          </View>

          <Pressable
            style={styles.smallActionButton}
            onPress={() => void openCamera()}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={21} color={THEME.white} />
            <Text style={styles.smallActionText}>Add</Text>
          </Pressable>
        </View>

        {activeAlbum === 'all' && (
          <Text style={styles.albumPickerLabel}>
            Choose an album for your next photo
          </Text>
        )}

        {activeAlbum === 'all' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.captureAlbumList}
          >
            {ALBUM_OPTIONS.filter((album) => album.id !== 'all').map(
              (album) => {
                const isSelected = captureAlbum === album.id;

                return (
                  <Pressable
                    key={album.id}
                    style={[
                      styles.captureAlbumChip,
                      isSelected && styles.captureAlbumChipActive,
                    ]}
                    onPress={() => setCaptureAlbum(album.id)}
                  >
                    <Text
                      style={[
                        styles.captureAlbumText,
                        isSelected && styles.captureAlbumTextActive,
                      ]}
                    >
                      {album.title}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </ScrollView>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.navy} />
            <Text style={styles.loadingText}>Organizing your memories...</Text>
          </View>
        ) : filteredPhotos.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="images-outline"
                size={42}
                color={THEME.navy}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {activeAlbum === 'all'
                ? 'Your story starts here'
                : 'This album is waiting for memories'}
            </Text>

            <Text style={styles.emptyDescription}>
              {activeAlbum === 'all'
                ? 'Capture your first campus photo and start building your personal collection.'
                : `Take a photo and save it to ${ALBUM_OPTIONS.find((album) => album.id === activeAlbum)?.title}.`}
            </Text>

            <Pressable
              style={styles.emptyButton}
              onPress={() => void openCamera()}
              accessibilityRole="button"
            >
              <Ionicons
                name="camera-outline"
                size={19}
                color={THEME.white}
              />
              <Text style={styles.emptyButtonText}>Capture a Memory</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoGrid}>
            {filteredPhotos.map((photo) => (
              <View key={photo.name} style={styles.photoItem}>
                <Pressable
                  onPress={() => setSelectedPhoto(photo)}
                  accessibilityRole="button"
                  accessibilityLabel="View photo"
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />

                  <View style={styles.photoImageOverlay}>
                    <Ionicons
                      name="expand-outline"
                      size={18}
                      color={THEME.white}
                    />
                  </View>
                </Pressable>

                <View style={styles.photoInfo}>
                  <Text style={styles.photoAlbum} numberOfLines={1}>
                    {photo.album}
                  </Text>
                  <Text style={styles.photoDate} numberOfLines={1}>
                    {formatDate(photo.createdAt)}
                  </Text>

                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => deletePhoto(photo)}
                    accessibilityRole="button"
                    accessibilityLabel="Delete photo"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={THEME.danger}
                    />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Ionicons
            name="phone-portrait-outline"
            size={15}
            color={THEME.muted}
          />
          <Text style={styles.footerNote}>
            Stored on this device. Uninstalling the app or clearing its data
            may remove your photos.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={selectedPhoto !== null}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
        statusBarTranslucent
      >
        <View style={styles.viewerScreen}>
          <StatusBar barStyle="light-content" backgroundColor="#07182D" />

          <View style={styles.viewerHeader}>
            <Pressable
              onPress={() => setSelectedPhoto(null)}
              style={styles.viewerIconButton}
              accessibilityLabel="Close photo viewer"
            >
              <Ionicons name="close" size={27} color={THEME.white} />
            </Pressable>

            <View style={styles.viewerHeading}>
              <Text style={styles.viewerTitle}>Campus Memory</Text>
              <Text style={styles.viewerSubtitle}>
                {selectedPhoto?.album ?? ''}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                if (selectedPhoto) {
                  deletePhoto(selectedPhoto);
                }
              }}
              style={styles.viewerIconButton}
              accessibilityLabel="Delete selected photo"
            >
              <Ionicons
                name="trash-outline"
                size={23}
                color={THEME.white}
              />
            </Pressable>
          </View>

          {selectedPhoto ? (
            <>
              <Image
                source={{ uri: selectedPhoto.uri }}
                style={styles.fullImage}
                resizeMode="contain"
              />

              <Text style={styles.viewerDate}>
                {formatDate(selectedPhoto.createdAt)}
              </Text>
            </>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: THEME.navyLight,
    marginBottom: 3,
  },
  title: {
    fontSize: 25,
    fontWeight: '900',
    color: THEME.navy,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.muted,
    marginTop: 3,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: THEME.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  heroCard: {
    minHeight: 218,
    borderRadius: 25,
    backgroundColor: THEME.navy,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroTextArea: {
    flex: 1,
    zIndex: 1,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#D8ECFF',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginBottom: 13,
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: THEME.navy,
  },
  heroTitle: {
    maxWidth: 230,
    color: THEME.white,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  heroDescription: {
    maxWidth: 230,
    color: '#D6E7FA',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  heroButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    minHeight: 41,
    backgroundColor: '#2C6096',
    borderRadius: 13,
    marginTop: 15,
  },
  heroButtonText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '800',
  },
  heroDecoration: {
    position: 'absolute',
    right: -12,
    bottom: 20,
    width: 130,
    height: 130,
    borderRadius: 42,
    backgroundColor: '#174477',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  heroSmallDecoration: {
    position: 'absolute',
    right: 18,
    top: 13,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#DDEFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: THEME.white,
    borderRadius: 18,
    marginBottom: 25,
  },
  privacyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  privacyText: {
    flex: 1,
  },
  privacyTitle: {
    color: THEME.navy,
    fontSize: 13,
    fontWeight: '800',
  },
  privacyDescription: {
    color: THEME.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: THEME.navy,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 4,
  },
  totalCount: {
    minWidth: 61,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.white,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  totalCountNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.navy,
  },
  totalCountLabel: {
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '800',
    color: THEME.muted,
    marginTop: 1,
  },
  albumList: {
    gap: 11,
    paddingBottom: 5,
    paddingRight: 4,
  },
  albumCard: {
    width: 124,
    minHeight: 139,
    padding: 13,
    borderRadius: 19,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 20,
    position: 'relative',
  },
  albumCardActive: {
    backgroundColor: THEME.navy,
    borderColor: THEME.navy,
  },
  albumIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: THEME.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  albumIconActive: {
    backgroundColor: '#2A578A',
  },
  albumTitle: {
    color: THEME.navy,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    minHeight: 32,
  },
  albumTitleActive: {
    color: THEME.white,
  },
  albumCount: {
    fontSize: 10,
    color: THEME.muted,
    marginTop: 5,
  },
  albumCountActive: {
    color: '#D6E7FA',
  },
  activeAlbumMark: {
    position: 'absolute',
    bottom: 0,
    left: 15,
    right: 15,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#91D4FF',
  },
  galleryHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 1,
    marginBottom: 14,
  },
  smallActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.navy,
    paddingHorizontal: 13,
    minHeight: 38,
    borderRadius: 12,
  },
  smallActionText: {
    fontSize: 12,
    color: THEME.white,
    fontWeight: '800',
  },
  albumPickerLabel: {
    color: THEME.muted,
    fontSize: 11,
    marginBottom: 9,
  },
  captureAlbumList: {
    gap: 8,
    paddingBottom: 15,
  },
  captureAlbumChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  captureAlbumChipActive: {
    backgroundColor: THEME.navy,
    borderColor: THEME.navy,
  },
  captureAlbumText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.navy,
  },
  captureAlbumTextActive: {
    color: THEME.white,
  },
  loadingContainer: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: THEME.muted,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: THEME.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 25,
    backgroundColor: THEME.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  emptyTitle: {
    color: THEME.navy,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyDescription: {
    color: THEME.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 9,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.navy,
    borderRadius: 13,
    minHeight: 45,
    paddingHorizontal: 17,
    marginTop: 19,
  },
  emptyButtonText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '800',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoItem: {
    width: '48.5%',
    marginBottom: 14,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 0.82,
    backgroundColor: THEME.blue,
  },
  photoImageOverlay: {
    position: 'absolute',
    right: 9,
    top: 9,
    width: 31,
    height: 31,
    borderRadius: 11,
    backgroundColor: 'rgba(11,46,89,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInfo: {
    minHeight: 68,
    paddingTop: 9,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 4,
    position: 'relative',
  },
  photoAlbum: {
    color: THEME.navy,
    fontSize: 11,
    fontWeight: '800',
    paddingRight: 28,
  },
  photoDate: {
    color: THEME.muted,
    fontSize: 10,
    marginTop: 5,
    paddingRight: 26,
  },
  deleteButton: {
    position: 'absolute',
    right: 5,
    top: 10,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 6,
  },
  footerNote: {
    flex: 1,
    color: THEME.muted,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: '#07182D',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    paddingHorizontal: 18,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cameraIconButton: {
    width: 45,
    height: 45,
    borderRadius: 16,
    backgroundColor: 'rgba(5,20,40,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraHeading: {
    flex: 1,
    alignItems: 'center',
  },
  cameraTitle: {
    color: THEME.white,
    fontSize: 16,
    fontWeight: '900',
  },
  cameraSubtitle: {
    color: '#D5E7F8',
    fontSize: 11,
    marginTop: 4,
  },
  cameraBottom: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  cameraHint: {
    color: THEME.white,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 23,
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 5,
    borderColor: THEME.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  viewerScreen: {
    flex: 1,
    backgroundColor: '#07182D',
    justifyContent: 'space-between',
  },
  viewerHeader: {
    minHeight: 75,
    paddingHorizontal: 15,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerHeading: {
    flex: 1,
    alignItems: 'center',
  },
  viewerTitle: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: '900',
  },
  viewerSubtitle: {
    color: '#BFD9F1',
    fontSize: 11,
    marginTop: 3,
  },
  fullImage: {
    flex: 1,
    width: '100%',
  },
  viewerDate: {
    color: '#D5E7F8',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
