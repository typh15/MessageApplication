import React from "react";
import {
    Pressable,
    Image,
    Text,
    StyleSheet,
    ColorValue,
    ImageSourcePropType,
    ViewStyle,
    TextStyle,
    ImageStyle,
} from "react-native";

type ButtonProps = {
    buttonText?: string;
    imageSource?: ImageSourcePropType;

    showText?: boolean;
    showImage?: boolean;

    width?: number;
    height?: number;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: ColorValue;

    imageWidth?: number;
    imageHeight?: number;

    backgroundColor?: ColorValue;
    disabledBackgroundColor?: ColorValue;
    textColor?: ColorValue;

    disabled?: boolean;
    onPress: () => void;
    invisibleWhenDisabled?: boolean;

    style?: ViewStyle;
    textStyle?: TextStyle;
    imageStyle?: ImageStyle;
};



export function Button({
    buttonText = "",
    imageSource,

    showText = true,
    showImage = false,

    width,
    height,
    borderRadius,
    borderWidth,
    borderColor,

    imageWidth = 24,
    imageHeight = 24,

    backgroundColor = "#4A5CFF",
    disabledBackgroundColor = "#303342",
    textColor = "#ffffff",
    invisibleWhenDisabled = false,

    disabled = false,
    onPress,

    style,
    textStyle,
    imageStyle,
}: ButtonProps) {
    const sizeStyle: ViewStyle = {};

    if (width !== undefined) {
        sizeStyle.width = width;
    }

    if (height !== undefined) {
        sizeStyle.height = height;
    }

    if (borderRadius !== undefined) {
        sizeStyle.borderRadius = borderRadius;
    }

    if (borderWidth !== undefined) {
        sizeStyle.borderWidth = borderWidth;
    }

    if (borderColor !== undefined) {
        sizeStyle.borderColor = borderColor;
    }


    
    if (invisibleWhenDisabled && disabled) {
        return null;
    }
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            style={({ pressed }) => [
                styles.button,
                sizeStyle,
                {
                    backgroundColor: disabled ? disabledBackgroundColor : backgroundColor,
                    opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                },
                style,
            ]}
        >
            {showImage && imageSource && (
                <Image
                    source={imageSource}
                    style={[
                        {
                            width: imageWidth,
                            height: imageHeight,
                        },
                        imageStyle,
                    ]}
                />
            )}

            {showText && !!buttonText && (
                <Text
                    style={[
                        styles.text,
                        { color: textColor },
                        textStyle,
                    ]}
                >
                    {buttonText}
                </Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        alignItems: "center",
        justifyContent: "center",
    },

    text: {
        fontWeight: "bold",
    },
});


