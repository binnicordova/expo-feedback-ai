import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useCreateFeedback } from "../hooks/useFeedbAI";
import { SendIcon } from "../icons";
import type { FeedbAIComposerProps } from "./FeedbAI.types";
import { useFeedbAITheme } from "./useTheme";

export default function FeedbAIComposer({
	onSubmit,
	titlePlaceholder = "I wish this app could…",
	descriptionPlaceholder = "A little more detail helps us build it right",
	submitLabel = "Send my idea",
	autoFocus = false,
	style,
	inputStyle,
}: FeedbAIComposerProps) {
	const { theme, styles } = useFeedbAITheme();
	const createFeedback = useCreateFeedback();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const canSubmit = title.trim().length > 2;

	const submit = () => {
		if (!canSubmit) return;
		const feedback = { title, description };
		createFeedback(feedback);
		onSubmit?.(feedback);
		setTitle("");
		setDescription("");
	};

	return (
		<View style={[styles.composer, style]}>
			<TextInput
				value={title}
				onChangeText={setTitle}
				placeholder={titlePlaceholder}
				placeholderTextColor={theme.mutedColor}
				autoFocus={autoFocus}
				returnKeyType="next"
				style={[styles.input, inputStyle]}
			/>
			<TextInput
				value={description}
				onChangeText={setDescription}
				placeholder={descriptionPlaceholder}
				placeholderTextColor={theme.mutedColor}
				multiline
				style={[styles.input, styles.inputMultiline, inputStyle]}
			/>
			<View style={styles.composerActions}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={submitLabel}
					accessibilityState={{ disabled: !canSubmit }}
					disabled={!canSubmit}
					onPress={submit}
					style={({ pressed }) => [
						styles.send,
						!canSubmit && styles.sendDisabled,
						pressed && styles.pressed,
					]}
				>
					{/* The disabled button's ground is `borderColor`, not the accent, so the
					    arrow cannot use the colour meant for drawing on the accent — in dark
					    mode that would be near-black on near-black. */}
					<SendIcon
						color={canSubmit ? theme.onPrimaryColor : theme.mutedColor}
					/>
				</Pressable>
			</View>
		</View>
	);
}
