import { Image } from 'expo-image';
import type { ImageLoadEventData } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { getImageUrl } from '@/APIHandlers/ApiHandlerHub';
import { ThemedText } from '../GenericComponents/themed-text';

import { Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MAX_IMAGE_WIDTH = 264;
const MAX_IMAGE_HEIGHT = 220;
const MIN_IMAGE_WIDTH = 156;
const IMAGE_RETRY_DELAYS_MS = [750, 2000] as const;

type ImageDimensions = {
    width: number;
    height: number;
};

type MessageBoxProps = {
    sender: string;
    message: string;
    timestamp: string;
    isSentByCurrentUser: boolean;
    messageType?: 'text' | 'image';
    imageId?: string;
};

export const MessageBox = memo(function MessageBox({
    sender,
    message,
    timestamp,
    isSentByCurrentUser,
    messageType = 'text',
    imageId,
}: MessageBoxProps) {
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
    const [imageReloadKey, setImageReloadKey] = useState(0);
    const [automaticImageRetryCount, setAutomaticImageRetryCount] = useState(0);
    const [imageRetryScheduled, setImageRetryScheduled] = useState(false);
    const [imageLoadFailed, setImageLoadFailed] = useState(false);
    const imageRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const theme = useTheme();
    const styles = useMessageBoxStyles();
    const date = new Date(timestamp);
    const formattedDate = new Intl.DateTimeFormat("en-US").format(date);
    const formattedTime = date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit", });

    const formattedDateTime = `${formattedTime} \u00B7 ${formattedDate}`;
    const isImageMessage = messageType === 'image';
    const trimmedMessage = message.trim();
    const imageUrl = useMemo(() => imageId ? getImageUrl(imageId) : null, [imageId]);
    const useFixedImageLayout = Platform.OS === 'android';
    const fittedImageSize = getFittedImageSize(useFixedImageLayout ? null : imageDimensions);
    const imageMessageWidth = fittedImageSize.width + Spacing.three * 2;
    const imageContentFit = useFixedImageLayout ? 'cover' : 'contain';

    useEffect(() => {
        setImageDimensions(null);
        setImageReloadKey(0);
        setAutomaticImageRetryCount(0);
        setImageRetryScheduled(false);
        setImageLoadFailed(false);

        if (imageRetryTimerRef.current !== null) {
            clearTimeout(imageRetryTimerRef.current);
            imageRetryTimerRef.current = null;
        }

        if (!imageUrl || Platform.OS !== 'web' || typeof window === 'undefined') {
            return () => {
                if (imageRetryTimerRef.current !== null) {
                    clearTimeout(imageRetryTimerRef.current);
                    imageRetryTimerRef.current = null;
                }
            };
        }

        let isActive = true;
        const browserImage = new window.Image();

        browserImage.onload = () => {
            if (
                isActive &&
                browserImage.naturalWidth > 0 &&
                browserImage.naturalHeight > 0
            ) {
                setImageDimensions({
                    width: browserImage.naturalWidth,
                    height: browserImage.naturalHeight,
                });
            }
        };

        browserImage.onerror = () => {
            if (isActive) {
                setImageDimensions(null);
            }
        };

        browserImage.src = imageUrl;

        return () => {
            isActive = false;
            browserImage.onload = null;
            browserImage.onerror = null;

            if (imageRetryTimerRef.current !== null) {
                clearTimeout(imageRetryTimerRef.current);
                imageRetryTimerRef.current = null;
            }
        };
    }, [imageUrl]);

    const handleImageLoad = (event: ImageLoadEventData) => {
        if (imageRetryTimerRef.current !== null) {
            clearTimeout(imageRetryTimerRef.current);
            imageRetryTimerRef.current = null;
        }

        setAutomaticImageRetryCount(0);
        setImageRetryScheduled(false);
        setImageLoadFailed(false);

        const { width, height } = event.source;

        if (width > 0 && height > 0) {
            setImageDimensions((currentDimensions) => {
                if (currentDimensions) {
                    return currentDimensions;
                }

                return { width, height };
            });
        }
    };

    const handleImageError = () => {
        if (imageRetryTimerRef.current !== null || imageLoadFailed) {
            return;
        }

        const retryDelayMs = IMAGE_RETRY_DELAYS_MS[automaticImageRetryCount];

        if (retryDelayMs === undefined) {
            setImageRetryScheduled(false);
            setImageLoadFailed(true);
            return;
        }

        setImageRetryScheduled(true);
        imageRetryTimerRef.current = setTimeout(() => {
            imageRetryTimerRef.current = null;
            setAutomaticImageRetryCount((count) => count + 1);
            setImageReloadKey((key) => key + 1);
            setImageRetryScheduled(false);
        }, retryDelayMs);
    };

    const handleRetryImage = () => {
        if (imageRetryTimerRef.current !== null) {
            clearTimeout(imageRetryTimerRef.current);
            imageRetryTimerRef.current = null;
        }

        setAutomaticImageRetryCount(0);
        setImageRetryScheduled(false);
        setImageLoadFailed(false);
        setImageReloadKey((key) => key + 1);
    };

    const handleOpenImageExternally = async () => {
        if (!imageUrl) {
            return;
        }

        try {
            await Linking.openURL(imageUrl);
        } catch (err) {
            console.error('Open image failed:', err);
            Alert.alert('Unable to open image', 'The image could not be opened in the browser.');
        }
    };

    return (
        <View style={[
            styles.messageContainer,
            isImageMessage && styles.imageMessageContainer,
            isImageMessage && { width: imageMessageWidth },
            isSentByCurrentUser ? styles.sentMessage : styles.receivedMessage,
        ]}>
            <View style={styles.messageHeader}>
                <ThemedText style={styles.sender} numberOfLines={1}>
                    {sender}
                </ThemedText>

                <ThemedText style={styles.timestamp} numberOfLines={1}>
                    {formattedDateTime}
                </ThemedText>
            </View>

            {isImageMessage && imageUrl ? (
                <>
                    <Pressable
                        onPress={imageLoadFailed
                            ? handleRetryImage
                            : () => setImagePreviewVisible(true)}
                        disabled={imageRetryScheduled}
                        onLongPress={handleOpenImageExternally}
                        delayLongPress={450}
                        accessibilityRole={imageLoadFailed ? 'button' : 'imagebutton'}
                        accessibilityLabel={imageLoadFailed
                            ? 'Retry loading picture message'
                            : imageRetryScheduled
                                ? 'Retrying picture message'
                                : 'Open picture message'}
                        style={({ pressed }) => [
                            styles.imagePressable,
                            fittedImageSize,
                            pressed && styles.imagePressablePressed,
                        ]}
                    >
                        {imageLoadFailed || imageRetryScheduled ? (
                            <View style={styles.imageRetryFallback}>
                                <ThemedText style={styles.imageRetryTitle}>
                                    {imageLoadFailed ? 'Picture unavailable' : 'Retrying picture...'}
                                </ThemedText>
                                <ThemedText style={styles.imageRetryText}>
                                    {imageLoadFailed ? 'Tap to retry' : 'Checking the connection'}
                                </ThemedText>
                            </View>
                        ) : (
                            <Image
                                key={`${imageId}-${imageReloadKey}`}
                                source={imageUrl}
                                style={styles.messageImage}
                                recyclingKey={`${imageId}-${imageReloadKey}`}
                                contentFit={imageContentFit}
                                cachePolicy="memory-disk"
                                priority="high"
                                onLoad={handleImageLoad}
                                onError={handleImageError}
                                accessibilityLabel={trimmedMessage || 'Picture message'}
                            />
                        )}
                    </Pressable>

                    <Modal
                        visible={imagePreviewVisible}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setImagePreviewVisible(false)}
                    >
                        <View style={styles.previewOverlay}>
                            <Pressable
                                style={styles.previewBackdrop}
                                onPress={() => setImagePreviewVisible(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close picture preview"
                            />

                            <Image
                                key={imageId}
                                source={imageUrl}
                                style={styles.previewImage}
                                recyclingKey={imageId}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                                accessibilityLabel={trimmedMessage || 'Picture message preview'}
                            />

                            <Pressable
                                onPress={() => setImagePreviewVisible(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close picture preview"
                                style={({ pressed }) => [
                                    styles.previewCloseButton,
                                    pressed && styles.imagePressablePressed,
                                ]}
                            >
                                <SymbolView
                                    name={{ ios: 'xmark', android: 'close', web: 'close' }}
                                    size={22}
                                    weight="bold"
                                    tintColor={theme.textOnAccent}
                                />
                            </Pressable>
                        </View>
                    </Modal>
                </>
            ) : null}

            {isImageMessage && !imageId ? (
                <ThemedText style={styles.unavailableImageText}>
                    Image unavailable
                </ThemedText>
            ) : null}

            {trimmedMessage ? (
                <ThemedText style={[styles.message, isImageMessage && styles.imageCaption]}>
                    {trimmedMessage}
                </ThemedText>
            ) : null}
        </View>
    );
});

function getFittedImageSize(dimensions: ImageDimensions | null): ImageDimensions {
    if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
        return {
            width: MAX_IMAGE_WIDTH,
            height: MAX_IMAGE_HEIGHT,
        };
    }

    const aspectRatio = dimensions.width / dimensions.height;
    let width = MAX_IMAGE_WIDTH;
    let height = width / aspectRatio;

    if (height > MAX_IMAGE_HEIGHT) {
        height = MAX_IMAGE_HEIGHT;
        width = height * aspectRatio;
    }

    if (width < MIN_IMAGE_WIDTH) {
        width = MIN_IMAGE_WIDTH;
        height = width / aspectRatio;
    }

    return {
        width: Math.round(width),
        height: Math.round(height),
    };
}

function useMessageBoxStyles() {
    const theme = useTheme();

    return useMemo(() => createMessageBoxStyles(theme), [theme]);
}

function createMessageBoxStyles(theme: AppTheme) {
    return StyleSheet.create({
    messageContainer: {
        maxWidth: "84%",
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: Radius.lg,
    },

    imageMessageContainer: {
        maxWidth: "84%",
    },

    sentMessage: {
        alignSelf: "flex-end",
        backgroundColor: theme.messageSent,
        borderBottomRightRadius: 6,
    },

    receivedMessage: {
        alignSelf: "flex-start",
        backgroundColor: theme.messageReceived,
        borderBottomLeftRadius: 6,
    },

    messageHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two,
        marginBottom: Spacing.half,
    },

    sender: {
        flexShrink: 1,
        fontWeight: "700",
        fontSize: 13,
        color: theme.text,
    },

    timestamp: {
        fontSize: 11,
        color: theme.textSecondary,
    },

    message: {
        fontSize: 17,
        lineHeight: 22,
        color: theme.text,
    },

    imageCaption: {
        marginTop: Spacing.two,
    },

    imagePressable: {
        borderRadius: Radius.md,
        overflow: "hidden",
    },

    imagePressablePressed: {
        opacity: 0.82,
    },

    imageRetryFallback: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        padding: Spacing.three,
        backgroundColor: theme.surfacePreview,
    },

    imageRetryTitle: {
        color: theme.text,
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center",
    },

    imageRetryText: {
        marginTop: Spacing.half,
        color: theme.textSecondary,
        fontSize: 13,
        textAlign: "center",
    },

    messageImage: {
        width: "100%",
        height: "100%",
        borderRadius: Radius.md,
        backgroundColor: theme.surfacePreview,
    },

    previewOverlay: {
        flex: 1,
        backgroundColor: theme.surfaceOverlay,
        alignItems: "center",
        justifyContent: "center",
        padding: Spacing.three,
    },

    previewBackdrop: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },

    previewImage: {
        width: "100%",
        height: "100%",
        maxWidth: 960,
        maxHeight: 720,
    },

    previewCloseButton: {
        position: "absolute",
        top: Spacing.four,
        right: Spacing.four,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.surfaceOverlayControl,
        borderWidth: 1,
        borderColor: theme.borderOverlay,
    },

    unavailableImageText: {
        color: theme.text,
        fontSize: 15,
        opacity: 0.82,
    },
    });
}
