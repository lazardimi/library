"use client"

import { useEffect, useState } from "react"
import TypedEventEmitter from "./TypedEventEmitter"

const locks: symbol[] = []
const locksChange = new TypedEventEmitter<{ change: [] }>()

export const refreshScrollLocks = () => {
	locksChange.dispatchEvent("change")
}

/**
 * lock and unlock the scroller, without interfering with other tools that also lock the scroller
 *
 * you can can either lock the scrolling
 * or force to unlock scrolling (even if locks exist)
 */
export const createScrollLock = (type: "lock" | "unlock" = "lock") => {
	const lockId = Symbol(`scroll-${type}`)

	locks.push(lockId)
	locksChange.dispatchEvent("change")

	return {
		/**
		 * you can call this multiple times without issue if it's more convenient
		 */
		release: () => {
			const index = locks.indexOf(lockId)

			if (index >= 0) {
				locks.splice(index, 1)
				locksChange.dispatchEvent("change")
			}
		},
	}
}

/**
 * lock and unlock the scroller, without interfering with other tools that also lock the scroller
 * plus some react state sugar for scroll locking to make it easier to use
 * locks are also automatically released on unmount
 *
 * you can can either lock the scrolling
 * or force to unlock scrolling (even if locks exist)
 *
 * you can also set the value via the second argument if you have external state
 */
export const useScrollLock = (
	type: "lock" | "unlock" = "lock",
	value?: boolean,
) => {
	const [locked, setLocked] = useState(false)
	const shouldLock = value ?? locked

	useEffect(() => {
		if (shouldLock) {
			const lock = createScrollLock(type)

			return () => lock.release()
		}
	}, [type, shouldLock])

	return [locked, setLocked] as const
}

/**
 * shorthand for pins — always "fixed" since smooth scrolling is disabled
 */
export const usePinType = () => "fixed" as const

/**
 * returns true if the user is on a pointer/mouse device (hover capable)
 */
export const useIsSmooth = () => {
	const [isMouse, setIsMouse] = useState(
		// biome-ignore lint/complexity/useOptionalChain: window cannot be chained
		typeof window !== "undefined" &&
			window.matchMedia("(hover: hover)").matches,
	)

	useEffect(() => {
		const enableMouse = () => setIsMouse(true)
		const disableMouse = () => setIsMouse(false)

		window.addEventListener("wheel", enableMouse, { passive: true })
		window.addEventListener("touchstart", disableMouse, { passive: true })

		return () => {
			window.removeEventListener("wheel", enableMouse)
			window.removeEventListener("touchstart", disableMouse)
		}
	}, [])

	useEffect(() => {
		const hover = window.matchMedia("(hover: hover)")
		if (!hover.matches) setIsMouse(false)
	}, [])

	return isMouse
}

export const SmoothScrollStyle = () => {
	useEffect(() => {
		const onChange = () => {
			const unlockers = locks.find(
				(lock) => lock.description === "scroll-unlock",
			)
			const lockers = locks.find((lock) => lock.description === "scroll-lock")

			if (unlockers || !lockers) {
				document.body.style.overflow = ""
			} else {
				document.body.style.overflow = "hidden"
			}
		}

		onChange()
		locksChange.addEventListener("change", onChange)
		return () => locksChange.removeEventListener("change", onChange)
	}, [])

	return null
}
