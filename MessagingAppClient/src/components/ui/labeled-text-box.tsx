import React from "react";

import {
    StyleSheet,
    ColorValue,
    ViewStyle,
    TextStyle,
    TextInput,
} from "react-native";
import { ThemedText } from "../GenericComponents/themed-text";
import { ThemedView } from "../GenericComponents/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type LabeledTextBoxProps = {
    value: string;
    onChangeText: (text: string) => void;
    
    placeholder?: string;
    containerStyle?: ViewStyle;
    labelStyle?: TextStyle;
    inputStyle?: TextStyle;
    labelText?: string;
    textColor?: ColorValue;
    labelColor?: ColorValue;
    borderColor?: ColorValue;
    backgroundColor?: ColorValue;
    editable?: boolean;
    password?: boolean;
    borderThickness?: number;

};



export function LabeledTextBox({
    labelText = "",
    value,
    onChangeText,

    placeholder = "",
    borderThickness = 0,
    backgroundColor,
    textColor,
    labelColor,
    borderColor,
    editable = true,
    containerStyle,
    labelStyle,
    inputStyle,
    password = false,
    
}: LabeledTextBoxProps) {

    const theme = useTheme();
    const resolvedBackgroundColor = backgroundColor ?? theme.background;
    const resolvedTextColor = textColor ?? theme.text;
    const resolvedLabelColor = labelColor ?? theme.text;
    const resolvedBorderColor = borderColor ?? theme.borderAccent;

    const styles = StyleSheet.create({
        container: {
            gap: Spacing.two,
            borderColor: resolvedBorderColor,
            backgroundColor: resolvedBackgroundColor,
            borderWidth: borderThickness,
            borderRadius: Radius.sm,
            padding: Spacing.two,
        },
        label: {
            fontSize: 16,
            fontWeight: '600',
            color: resolvedLabelColor,
        },
        input: {
            borderWidth: 1,
            borderRadius: Radius.sm,
            padding: Spacing.three,
            fontSize: 16,
            minHeight: 48,
            color: resolvedTextColor,
        },
    });

    return (
        <ThemedView style={[styles.container, containerStyle]}>
            <ThemedText style={[styles.label, labelStyle]}>
                {labelText}
            </ThemedText>

            <TextInput
                style={[styles.input, inputStyle]}
                placeholderTextColor={theme.inputPlaceholder}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                editable={editable}
                secureTextEntry={password}
            />
        </ThemedView>
    );
}


