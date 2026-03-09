import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SettingsDrawer } from "@/components/layout/SettingsDrawer";
import { useStudyStore } from "@/store/useStudyStore";
import { useAuthStore } from "@/store/useAuthStore";

const navItems = [
	{ path: "/", label: "概览" },
	{ path: "/questions", label: "题库" },
	{ path: "/practice", label: "练习" },
	{ path: "/weak", label: "薄弱点" },
	{ path: "/import", label: "导入" },
	{ path: "/prompt", label: "出题" },
];

export function Navbar() {
	const location = useLocation();
	const { theme, toggleTheme } = useStudyStore();
	const { user, isLoggedIn, login } = useAuthStore();
	const [scrolled, setScrolled] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);

	useEffect(() => {
		const handler = () => setScrolled(window.scrollY > 4);
		window.addEventListener("scroll", handler, { passive: true });
		return () => window.removeEventListener("scroll", handler);
	}, []);

	useEffect(() => {
		setMobileOpen(false);
	}, [location.pathname]);

	// Lock body scroll when mobile menu open
	useEffect(() => {
		document.body.style.overflow = mobileOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [mobileOpen]);

	const isActive = (path: string) =>
		path === "/"
			? location.pathname === "/"
			: location.pathname.startsWith(path);

	return (
		<>
			<header
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					zIndex: 50,
					height: "var(--navbar-h)",
					borderBottom: scrolled
						? "1px solid var(--border-subtle)"
						: "1px solid transparent",
					background: scrolled ? "var(--surface-glass)" : "transparent",
					backdropFilter: scrolled ? "saturate(180%) blur(20px)" : "none",
					WebkitBackdropFilter: scrolled ? "saturate(180%) blur(20px)" : "none",
					transition:
						"background 0.25s, border-color 0.25s, backdrop-filter 0.25s",
				}}
			>
				<div
					style={{
						maxWidth: 1100,
						margin: "0 auto",
						height: "100%",
						padding: "0 20px",
						display: "flex",
						alignItems: "center",
						gap: 8,
					}}
				>
					{/* Logo */}
					<Link
						to="/"
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							textDecoration: "none",
							marginRight: 8,
							flexShrink: 0,
						}}
					>
						<span
							style={{
								fontSize: 15,
								fontWeight: 600,
								color: "var(--text)",
								letterSpacing: "-0.01em",
							}}
						>
							iFace
						</span>
					</Link>

					{/* Desktop nav */}
					<nav
						style={{
							display: "flex",
							alignItems: "center",
							gap: 2,
							flex: 1,
						}}
						className="hidden-mobile"
					>
						{navItems.map((item) => {
							const active = isActive(item.path);
							return (
								<Link
									key={item.path}
									to={item.path}
									style={{
										padding: "5px 12px",
										borderRadius: 8,
										fontSize: 14,
										fontWeight: 500,
										color: active ? "var(--primary)" : "var(--text-2)",
										background: active ? "var(--primary-light)" : "transparent",
										letterSpacing: active ? undefined : "0.003em",
										textDecoration: "none",
										transition: "color 0.15s, background 0.15s",
										whiteSpace: "nowrap",
									}}
									onMouseEnter={(e) => {
										if (!active) {
											(e.currentTarget as HTMLElement).style.color =
												"var(--text)";
											(e.currentTarget as HTMLElement).style.background =
												"var(--surface-2)";
										}
									}}
									onMouseLeave={(e) => {
										if (!active) {
											(e.currentTarget as HTMLElement).style.color =
												"var(--text-2)";
											(e.currentTarget as HTMLElement).style.background =
												"transparent";
										}
									}}
								>
									{item.label}
								</Link>
							);
						})}
					</nav>

					<div style={{ flex: 1 }} className="show-mobile" />

					{/* Actions */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 4,
							flexShrink: 0,
						}}
					>
						{/* GitHub login / avatar button */}
						<button
							onClick={() => {
								if (isLoggedIn) {
									setSettingsOpen(true);
								} else {
									login();
								}
							}}
							aria-label={isLoggedIn ? `已登录：${user?.login}` : "GitHub 登录"}
							title={isLoggedIn ? `@${user?.login}（点击进入设置）` : "用 GitHub 登录同步进度"}
							style={{
								width: 32,
								height: 32,
								borderRadius: isLoggedIn ? "50%" : 8,
								border: isLoggedIn ? "2px solid var(--border)" : "none",
								background: "transparent",
								padding: 0,
								color: "var(--text-2)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: "pointer",
								transition: "opacity 0.15s, border-color 0.15s",
								overflow: "hidden",
								flexShrink: 0,
							}}
							onMouseEnter={(e) => {
								if (isLoggedIn) {
									(e.currentTarget as HTMLElement).style.borderColor = "var(--primary)";
								} else {
									(e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
									(e.currentTarget as HTMLElement).style.color = "var(--text)";
								}
							}}
							onMouseLeave={(e) => {
								if (isLoggedIn) {
									(e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
								} else {
									(e.currentTarget as HTMLElement).style.background = "transparent";
									(e.currentTarget as HTMLElement).style.color = "var(--text-2)";
								}
							}}
						>
							{isLoggedIn && user ? (
								<img
									src={user.avatar_url}
									alt={user.login}
									style={{ width: "100%", height: "100%", objectFit: "cover" }}
								/>
							) : (
								/* Cloud upload icon — signals "sync / backup to cloud" */
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
									<polyline points="16 16 12 12 8 16" />
									<line x1="12" y1="12" x2="12" y2="21" />
									<path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
								</svg>
							)}
						</button>

						{/* Settings button */}
						<button
							onClick={() => setSettingsOpen(true)}
							aria-label="设置"
							style={{
								width: 32,
								height: 32,
								borderRadius: 8,
								border: "none",
								background: "transparent",
								color: "var(--text-2)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: "pointer",
								transition: "background 0.15s, color 0.15s",
								flexShrink: 0,
							}}
							onMouseEnter={(e) => {
								(e.currentTarget as HTMLElement).style.background =
									"var(--surface-2)";
								(e.currentTarget as HTMLElement).style.color = "var(--text)";
							}}
							onMouseLeave={(e) => {
								(e.currentTarget as HTMLElement).style.background =
									"transparent";
								(e.currentTarget as HTMLElement).style.color = "var(--text-2)";
							}}
						>
							<svg
								width="15"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
						</button>

						{/* Theme toggle */}
						<button
							onClick={toggleTheme}
							aria-label={theme === "dark" ? "切换亮色" : "切换暗色"}
							style={{
								width: 32,
								height: 32,
								borderRadius: 8,
								border: "none",
								background: "transparent",
								color: "var(--text-2)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: "pointer",
								transition: "background 0.15s, color 0.15s",
								flexShrink: 0,
							}}
							onMouseEnter={(e) => {
								(e.currentTarget as HTMLElement).style.background =
									"var(--surface-2)";
								(e.currentTarget as HTMLElement).style.color = "var(--text)";
							}}
							onMouseLeave={(e) => {
								(e.currentTarget as HTMLElement).style.background =
									"transparent";
								(e.currentTarget as HTMLElement).style.color = "var(--text-2)";
							}}
						>
							{theme === "dark" ? (
								<svg
									width="15"
									height="15"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<circle cx="12" cy="12" r="5" />
									<line x1="12" y1="1" x2="12" y2="3" />
									<line x1="12" y1="21" x2="12" y2="23" />
									<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
									<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
									<line x1="1" y1="12" x2="3" y2="12" />
									<line x1="21" y1="12" x2="23" y2="12" />
									<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
									<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
								</svg>
							) : (
								<svg
									width="15"
									height="15"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
								</svg>
							)}
						</button>

						{/* Mobile hamburger */}
						<button
							onClick={() => setMobileOpen((v) => !v)}
							aria-label="菜单"
							aria-expanded={mobileOpen}
							className="show-mobile"
							style={{
								width: 32,
								height: 32,
								borderRadius: 8,
								border: "none",
								background: mobileOpen ? "var(--surface-2)" : "transparent",
								color: "var(--text-2)",
								display: "none",
								alignItems: "center",
								justifyContent: "center",
								cursor: "pointer",
								flexShrink: 0,
							}}
						>
							{mobileOpen ? (
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.2"
									strokeLinecap="round"
								>
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							) : (
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.2"
									strokeLinecap="round"
								>
									<line x1="3" y1="7" x2="21" y2="7" />
									<line x1="3" y1="12" x2="21" y2="12" />
									<line x1="3" y1="17" x2="21" y2="17" />
								</svg>
							)}
						</button>
					</div>
				</div>
			</header>

			{/* Mobile overlay */}
			{mobileOpen && (
				<div
					onClick={() => setMobileOpen(false)}
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 40,
						background: "rgba(0,0,0,0.2)",
					}}
				/>
			)}

			{/* Mobile menu */}
			<div
				style={{
					position: "fixed",
					top: "var(--navbar-h)",
					left: 0,
					right: 0,
					zIndex: 45,
					background: "var(--surface-glass)",
					backdropFilter: "saturate(180%) blur(20px)",
					WebkitBackdropFilter: "saturate(180%) blur(20px)",
					borderBottom: "1px solid var(--border-subtle)",
					padding: "8px 16px 16px",
					display: "none",
					flexDirection: "column",
					gap: 2,
					boxShadow: "var(--shadow-lg)",
					animation: "slide-down 0.2s var(--ease-out) both",
				}}
				className={mobileOpen ? "mobile-menu-open" : ""}
			>
				{navItems.map((item) => {
					const active = isActive(item.path);
					return (
						<Link
							key={item.path}
							to={item.path}
							style={{
								padding: "10px 14px",
								borderRadius: 10,
								fontSize: 15,
								fontWeight: active ? 500 : 400,
								color: active ? "var(--primary)" : "var(--text)",
								background: active ? "var(--primary-light)" : "transparent",
								textDecoration: "none",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							{item.label}
							{active && (
								<div
									style={{
										width: 6,
										height: 6,
										borderRadius: "50%",
										background: "var(--primary)",
									}}
								/>
							)}
						</Link>
					);
				})}

				{/* Settings entry in mobile menu */}
				<button
					onClick={() => {
						setMobileOpen(false);
						setSettingsOpen(true);
					}}
					style={{
						padding: "10px 14px",
						borderRadius: 10,
						fontSize: 15,
						fontWeight: 400,
						color: "var(--text)",
						background: "transparent",
						border: "none",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: 8,
						width: "100%",
						textAlign: "left",
						marginTop: 4,
						borderTop: "1px solid var(--border-subtle)",
					}}
				>
					<svg
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							style={{ color: "var(--text-2)" }}
						>
							<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
							<circle cx="12" cy="12" r="3" />
						</svg>
					设置
				</button>
			</div>

			{/* Settings Drawer */}
			<SettingsDrawer
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>

			<style>{`
        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
          .mobile-menu-open { display: flex !important; }
        }
        @media (min-width: 641px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
		</>
	);
}
