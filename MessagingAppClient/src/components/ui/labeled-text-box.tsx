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
import { Spacing } from "@/constants/theme";
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
    backgroundColor = "#000000",
    textColor = "#ffffff",
    labelColor = "#ffffff",
    borderColor = "#4dacff80",
    editable = true,
    containerStyle,
    labelStyle,
    inputStyle,
    password = false,
    
}: LabeledTextBoxProps) {

    const styles = StyleSheet.create({
        container: {
            gap: Spacing.two,
            borderColor: borderColor,
            backgroundColor: backgroundColor,
            borderWidth: borderThickness,
            borderRadius: 8,
            padding: Spacing.two,
        },
        label: {
            fontSize: 16,
            fontWeight: '600',
            color: labelColor,
        },
        input: {
            borderWidth: 1,
            borderRadius: 8,
            padding: Spacing.three,
            fontSize: 16,
            minHeight: 48,
            color: textColor,
        },
    });
    
    const theme = useTheme();

    return (
        <ThemedView style={[styles.container, containerStyle]}>
            <ThemedText style={[styles.label, labelStyle]}>
                {labelText}
            </ThemedText>

            <TextInput
                style={[styles.input, inputStyle]}
                placeholderTextColor={theme.text + '80'}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                editable={editable}
                secureTextEntry={password}
            />
        </ThemedView>
    );
}


