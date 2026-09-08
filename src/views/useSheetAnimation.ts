import { useEffect, useRef, useState } from "react";
import { Animated, Keyboard, Platform } from "react-native";

/**
 * Drives a bottom sheet from a single 0→1 value: 0 is offscreen, 1 is settled.
 *
 * The Modal outlives `visible` on the way out — it stays mounted until the sheet has
 * finished sliding away, so dismissing is animated instead of a disappearance. A
 * `0..1` progress (rather than a pixel offset) means the interpolation can be rebuilt
 * from the current window height on rotation without fighting an in-flight animation.
 */
export const useSheetTransition = (visible: boolean) => {
	const progress = useRef(new Animated.Value(0)).current;
	const [mounted, setMounted] = useState(visible);

	useEffect(() => {
		if (visible) {
			setMounted(true);
			Animated.spring(progress, {
				toValue: 1,
				useNativeDriver: true,
				damping: 24,
				stiffness: 240,
			}).start();
			return;
		}

		Animated.timing(progress, {
			toValue: 0,
			duration: 220,
			useNativeDriver: true,
		}).start(({ finished }) => {
			// An interrupted animation means it is on its way back in; leave it mounted.
			if (finished) setMounted(false);
		});
	}, [visible, progress]);

	return { mounted, progress };
};

/**
 * Tracks the keyboard so a sheet can sit on top of it.
 *
 * `KeyboardAvoidingView` does not help here: the sheet is anchored to the bottom of a
 * Modal, so it has no layout relationship to the keyboard. The `will*` events on iOS
 * fire in step with the system animation, so the sheet and the keyboard move together.
 */
export const useKeyboardInset = (bottomInset: number) => {
	const inset = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const ios = Platform.OS === "ios";
		const show = Keyboard.addListener(
			ios ? "keyboardWillShow" : "keyboardDidShow",
			(event) =>
				Animated.timing(inset, {
					// The keyboard already covers the home indicator, so drop that padding.
					toValue: Math.max(0, event.endCoordinates.height - bottomInset),
					duration: event.duration || 250,
					useNativeDriver: true,
				}).start(),
		);
		const hide = Keyboard.addListener(
			ios ? "keyboardWillHide" : "keyboardDidHide",
			(event) =>
				Animated.timing(inset, {
					toValue: 0,
					duration: event?.duration || 250,
					useNativeDriver: true,
				}).start(),
		);

		return () => {
			show.remove();
			hide.remove();
		};
	}, [inset, bottomInset]);

	return inset;
};
