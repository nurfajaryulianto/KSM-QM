<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>LoanPro - Executive Leaderboard</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "secondary-container": "#d0e1fb",
                        "secondary-fixed": "#d3e4fe",
                        "error": "#ba1a1a",
                        "inverse-on-surface": "#eff1f3",
                        "on-secondary": "#ffffff",
                        "on-surface": "#191c1e",
                        "secondary-fixed-dim": "#b7c8e1",
                        "on-error": "#ffffff",
                        "primary-container": "#1d67e8",
                        "on-error-container": "#93000a",
                        "surface-container": "#eceef0",
                        "secondary": "#505f76",
                        "surface-container-lowest": "#ffffff",
                        "primary": "#004fbf",
                        "tertiary-fixed": "#6ffbbe",
                        "surface-container-highest": "#e0e3e5",
                        "on-primary": "#ffffff",
                        "on-tertiary": "#ffffff",
                        "tertiary": "#006443",
                        "on-surface-variant": "#424654",
                        "on-secondary-fixed": "#0b1c30",
                        "surface-container-high": "#e6e8ea",
                        "outline": "#737786",
                        "tertiary-container": "#007f57",
                        "surface-variant": "#e0e3e5",
                        "surface-dim": "#d8dadc",
                        "on-primary-fixed-variant": "#00419f",
                        "on-secondary-fixed-variant": "#38485d",
                        "on-primary-fixed": "#001947",
                        "tertiary-fixed-dim": "#4edea3",
                        "primary-fixed": "#dae2ff",
                        "surface-tint": "#0056d0",
                        "inverse-surface": "#2d3133",
                        "on-tertiary-container": "#ccffe2",
                        "on-background": "#191c1e",
                        "on-secondary-container": "#54647a",
                        "on-tertiary-fixed-variant": "#005236",
                        "outline-variant": "#c2c6d7",
                        "on-tertiary-fixed": "#002113",
                        "surface-bright": "#f7f9fb",
                        "primary-fixed-dim": "#b1c5ff",
                        "error-container": "#ffdad6",
                        "inverse-primary": "#b1c5ff",
                        "on-primary-container": "#f1f2ff",
                        "surface-container-low": "#f2f4f6",
                        "surface": "#f7f9fb",
                        "background": "#f7f9fb"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "sm": "12px",
                        "lg": "24px",
                        "gutter": "20px",
                        "container-margin": "24px",
                        "xl": "32px",
                        "xs": "8px",
                        "md": "16px",
                        "base": "4px"
                    },
                    "fontFamily": {
                        "body-lg": ["Manrope"],
                        "body-md": ["Manrope"],
                        "display-lg-mobile": ["Manrope"],
                        "label-sm": ["Manrope"],
                        "label-xs": ["Manrope"],
                        "display-lg": ["Manrope"],
                        "display-md": ["Manrope"],
                        "headline-sm": ["Manrope"]
                    },
                    "fontSize": {
                        "body-lg": ["16px", {"lineHeight": "24px", "fontWeight": "500"}],
                        "body-md": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
                        "display-lg-mobile": ["24px", {"lineHeight": "32px", "fontWeight": "700"}],
                        "label-sm": ["12px", {"lineHeight": "16px", "fontWeight": "600"}],
                        "label-xs": ["11px", {"lineHeight": "14px", "fontWeight": "500"}],
                        "display-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                        "display-md": ["24px", {"lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "700"}],
                        "headline-sm": ["18px", {"lineHeight": "26px", "fontWeight": "600"}]
                    }
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        .custom-shadow {
            box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.05);
        }
        .sparkline-svg {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
            animation: dash 3s linear forwards;
        }
        @keyframes dash {
            to { stroke-dashoffset: 0; }
        }
    </style>
</head>
<body class="bg-background font-body-md text-on-surface">
<!-- Persistent Side Navigation Rail -->
<aside class="fixed left-0 top-0 h-screen flex flex-col py-6 px-4 w-[240px] bg-surface-container-lowest border-r border-outline-variant z-50">
<div class="mb-xl px-2">
<h1 class="text-headline-sm font-bold text-primary">LoanPro</h1>
<p class="text-label-xs text-on-surface-variant font-label-xs uppercase tracking-wider">Executive Portal</p>
</div>
<nav class="flex-1 space-y-1">
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200" href="#">
<span class="material-symbols-outlined">dashboard</span>
<span class="font-label-sm text-label-sm">Dashboard</span>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200" href="#">
<span class="material-symbols-outlined">description</span>
<span class="font-label-sm text-label-sm">Loan Applications</span>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200" href="#">
<span class="material-symbols-outlined">group</span>
<span class="font-label-sm text-label-sm">Contacts</span>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200" href="#">
<span class="material-symbols-outlined">assignment</span>
<span class="font-label-sm text-label-sm">Tasks</span>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200" href="#">
<span class="material-symbols-outlined">chat</span>
<span class="font-label-sm text-label-sm">Communications</span>
</a>
<div class="pt-2">
<button class="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-secondary-container text-primary font-bold border-l-4 border-primary">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined">bar_chart</span>
<span class="font-label-sm text-label-sm">Reports</span>
</div>
<span class="material-symbols-outlined text-sm">expand_more</span>
</button>
<div class="ml-9 mt-1 flex flex-col space-y-1 border-l border-outline-variant">
<a class="px-4 py-1.5 text-label-xs text-on-surface-variant hover:text-primary" href="#">Pipeline Report</a>
<a class="px-4 py-1.5 text-label-xs text-on-surface-variant hover:text-primary" href="#">Loan Insight Report</a>
<a class="px-4 py-1.5 text-label-xs text-primary font-bold" href="#">Leaderboard</a>
<a class="px-4 py-1.5 text-label-xs text-on-surface-variant hover:text-primary" href="#">Status Report</a>
</div>
</div>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200" href="#">
<span class="material-symbols-outlined">payments</span>
<span class="font-label-sm text-label-sm">Commissions</span>
</a>
</nav>
<div class="mt-auto border-t border-outline-variant pt-4 px-2">
<div class="flex items-center gap-3 group cursor-pointer">
<img class="w-10 h-10 rounded-full object-cover border border-outline-variant" data-alt="A professional headshot of an executive administrator named Jane Doe, set against a clean studio background with soft directional lighting. She is wearing a professional blazer, exuding confidence and leadership. The style is high-end corporate photography with a warm, approachable color grade that fits a modern fintech dashboard." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB58PLaXMgAZE3HGKs-oSLGjE15Izx1OSxJJNTgOGnbkd5t86Agbv9qRVCw0JOREr73K5bzNw9AMl-Zg2ksDEU9yWjelRPXY1_np6SKituieJzuFS2mQMyODzDTMGRFUkWFXoUialjxNUzXyKAU1ct6tKVZbNTUbi8iy8ae-G7K7wzi2qqqH1-btp_JjwtJem0-t9e_FrTDzB7F4sKOjEhgCrpP9U-sq5BaqO91k9PHK3aGkr167-ihLZHQD9qIHGpGa9SsYGI2UUHc"/>
<div>
<p class="text-label-sm font-bold text-on-surface">Jane Doe</p>
<p class="text-label-xs text-on-surface-variant">Admin</p>
</div>
<span class="material-symbols-outlined ml-auto text-on-surface-variant group-hover:text-primary transition-colors">settings</span>
</div>
</div>
</aside>
<!-- Main Workspace Content -->
<main class="ml-[240px] min-h-screen">
<!-- Top Bar Navigation -->
<header class="flex justify-between items-center px-lg py-sm h-16 sticky top-0 bg-surface-bright z-40">
<h2 class="font-display-md text-display-md text-on-surface">Leaderboard</h2>
<div class="flex items-center gap-lg">
<div class="relative w-64">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-md">search</span>
<input class="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-body-md focus:ring-2 focus:ring-primary transition-all" placeholder="Search" type="text"/>
</div>
<div class="flex items-center gap-md">
<button class="p-2 rounded-full hover:bg-surface-container-low transition-colors relative">
<span class="material-symbols-outlined text-on-surface-variant">notifications</span>
<span class="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface-bright"></span>
</button>
</div>
</div>
</header>
<!-- Dashboard Canvas -->
<div class="px-container-margin py-lg grid grid-cols-12 gap-gutter">
<!-- Left Column: Summary and Full Leaderboard (Col 1-4) -->
<div class="col-span-12 lg:col-span-4 space-y-gutter">
<!-- Total Loan Closed Card -->
<section class="bg-surface-container-lowest p-lg rounded-xl custom-shadow">
<h3 class="text-label-sm font-bold text-on-surface-variant mb-md uppercase tracking-wide">Total Loan Closed</h3>
<div class="flex items-end gap-xl mb-md">
<div>
<p class="text-display-lg font-display-lg text-on-surface">$245.3k</p>
<p class="text-label-xs text-on-surface-variant">This Year</p>
</div>
<div class="pb-1">
<div class="flex items-center text-error gap-0.5">
<span class="material-symbols-outlined text-sm">arrow_downward</span>
<span class="font-bold text-label-sm">2.5%</span>
</div>
<p class="text-label-xs text-on-surface-variant">Vs Last week</p>
</div>
</div>
<!-- Progress Rail -->
<div class="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
<div class="h-full bg-primary w-[70%]" style="transition: width 1s ease-out"></div>
</div>
</section>
<!-- Full Leaderboard List Card -->
<section class="bg-surface-container-lowest p-lg rounded-xl custom-shadow">
<h3 class="text-label-sm font-bold text-on-surface mb-lg">Leaderboard this year</h3>
<div class="space-y-4">
<!-- Performer Item Template -->
<div class="flex items-center justify-between py-2 border-b border-outline-variant/30 last:border-0">
<div class="flex items-center gap-md">
<span class="text-label-sm font-bold text-on-surface-variant w-4">1</span>
<span class="material-symbols-outlined text-tertiary text-sm">expand_less</span>
<img class="w-8 h-8 rounded-full object-cover" data-alt="Close-up professional headshot of John Doe, an experienced mortgage broker in a crisp blue suit. He has a friendly but professional expression, wearing stylish glasses. The background is a clean blue office environment with soft bokeh. Modern executive photography style, bright and high contrast." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRAskYBYRd36Jtii5GM-ZMCfe5CZoN7UgB0CeMwrWIlMAFDj7toVb18zD3HKTj8CzatotNtfAPrg05TS00JbPwjClI8PFoUG5llf64hsYdG_ZGHYv43A7QojxgOed_3gAlW1SE-8nlzCTlRQB-v7UsNEZZxK7BXM5fkDBwaFUE-ff9_S-lrN-_HBQ5Ic3_vCJF-O8fHMBNqN1G6WR-EWpY3ECumMiib8_p3gP4O2a6JG2ArFTJdPeTtQD3EtqBQrGr_RUf46y2b7YP"/>
<span class="text-body-md font-semibold text-on-surface">John Doe</span>
</div>
<span class="text-body-md font-bold text-on-surface">$102.7k</span>
</div>
<div class="flex items-center justify-between py-2 border-b border-outline-variant/30">
<div class="flex items-center gap-md">
<span class="text-label-sm font-bold text-on-surface-variant w-4">2</span>
<span class="material-symbols-outlined text-tertiary text-sm">expand_less</span>
<img class="w-8 h-8 rounded-full object-cover" data-alt="Professional corporate headshot of Jane Roberts, a high-performing loan officer with blonde hair, wearing a sophisticated dark charcoal business suit. She is standing in a brightly lit modern office corridor with architectural details. The lighting is flattering and high-key, maintaining a professional corporate aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGdAbjVIMOo5H3UAMbmgLyO7GhcRhX61GViMUKdE0RYyv9jH_CUVOcugEV4x7-D2JaRu-LUQgzUoKN7gzht9AKMJYNGC0AAN2ELxbY5xnr5yIoI8hPGg4y-hIUbJIf1H3m3C8KEPPDAi30z7bTWRiyjtckG-zJyau1gtqbehytoueZ7keTeNZzitHsz44SdfOVQH0OEvPY24-hSvLqwrLGoeMRthIMEfkwu5eJE_dABKK8MFMQS1mTK4NBg_LxRKKMlnoDtAm0UccK"/>
<span class="text-body-md font-semibold text-on-surface">Jane Roberts</span>
</div>
<span class="text-body-md font-bold text-on-surface">$71.6k</span>
</div>
<div class="flex items-center justify-between py-2 border-b border-outline-variant/30">
<div class="flex items-center gap-md">
<span class="text-label-sm font-bold text-on-surface-variant w-4">3</span>
<span class="material-symbols-outlined text-error text-sm">expand_more</span>
<img class="w-8 h-8 rounded-full object-cover" data-alt="Portrait of Manny Johnson, a young and energetic financial consultant. He is smiling warmly, wearing a casual yet professional button-down grey shirt. The background is a neutral professional setting with soft, ambient lighting. The visual style is crisp and modern, reflecting trust and expertise in finance." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmeD_FIkejiAWVxW3kEutOzHNMPANdKxSJDowNAedbBRhoJpkn04Sj8pP5uFb_C-lNJr1vXOs352no8oocLdw7LwrCDQNjWG-1hupZDR05Lo71ZmuWmohyjw3UNA41lo71m9SqQ7iMPjHyLDOweWHiQUEc4KWeFbcdTIpqZRIPm_aPkDWtJHHU4mFsnGh7SFg1Q_JywyNySdyvYeZuvbW2i9pTx0l6Ij7yoHaGC1tgofsgHSEQshTucUKepO0vPPTVMNOOJkzwLJRw"/>
<span class="text-body-md font-semibold text-on-surface">Manny Johnson</span>
</div>
<span class="text-body-md font-bold text-on-surface">$45.3k</span>
</div>
<!-- Continued Performers -->
<div class="flex items-center justify-between py-2 border-b border-outline-variant/30">
<div class="flex items-center gap-md">
<span class="text-label-sm font-bold text-on-surface-variant w-4">4</span>
<span class="material-symbols-outlined text-error text-sm">expand_more</span>
<img class="w-8 h-8 rounded-full object-cover" data-alt="Professional headshot of Olivia Reyes, a loan coordinator. She has a confident, welcoming smile and professional attire. The lighting is soft and even, set in a contemporary office space. The colors are muted and professional, emphasizing clarity and trust." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTNbZwLUKzf9pcM6dga_l-b3j-B2b-760XRXh9n22i6i3gZ6IxB0strF99VsrEhyUgC3jDrDOnhDt_Lx1WBLNQCRTWOP8E3l5CevFNZl6LwbCa5wdQ42eNCn1K3hJ9fyd26YdwebpkvGqNYwuvWkXaz3kQChFec6srB-F6zyX02Gtu3UneWktJv9VJeR5BNeb-_W4-k269gwlHVymavS5RGanmVKKbNx5JQCULea9CQiLjcsOZTPjjxBc79RjoDO2CC56c-uZbA9RJ"/>
<span class="text-body-md font-semibold text-on-surface">Olivia Reyes</span>
</div>
<span class="text-body-md font-bold text-on-surface">$28.9k</span>
</div>
<div class="flex items-center justify-between py-2 border-b border-outline-variant/30">
<div class="flex items-center gap-md">
<span class="text-label-sm font-bold text-on-surface-variant w-4">5</span>
<span class="material-symbols-outlined text-tertiary text-sm">expand_less</span>
<img class="w-8 h-8 rounded-full object-cover" data-alt="Professional portrait of Liam Carter, a dedicated finance professional. He is dressed in business casual, looking directly at the camera with a friendly and capable expression. Studio lighting provides high clarity and sharp focus, fitting for an executive dashboard interface." src="https://lh3.googleusercontent.com/aida-public/AB6AXuACjozVE-OxrsybUjWNVdZYXuIFchiTZMRmO3l4C7vy6_EoneJ_2UadIhyJ8nTfscon4ga5MKCH7v0cgChUPi-cTcqG5O56qxwfNnuPq4K4S4mNrIpbspvFrcseEdmWEgMF8BwkQcIzMbcXARxBILOKtg5knsvOH1ywhBRC52uP8puT1c5Z4BdA1gVL2-bXtlOq-eLoW6fr-fNSoWg0vg6KvveR-EuLSNwnyyfGRnmJy-VpfWhUyJe2G0j0dmVkXL_ojYQZfxzpZ0RO"/>
<span class="text-body-md font-semibold text-on-surface">Liam Carter</span>
</div>
<span class="text-body-md font-bold text-on-surface">$26.2k</span>
</div>
<div class="flex items-center justify-between py-2 border-b border-outline-variant/30">
<div class="flex items-center gap-md">
<span class="text-label-sm font-bold text-on-surface-variant w-4">6</span>
<span class="material-symbols-outlined text-outline text-sm">remove</span>
<img class="w-8 h-8 rounded-full object-cover" data-alt="Professional headshot of Sophia Bennett, a senior relationship manager. She exudes professionalism and approachability, with soft studio lighting enhancing her features. The aesthetic is clean corporate modernism, with a focus on trust and competence." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCuMdCeOJPFX_OQy9SiNmTzvGzRZZTDyTDHzWRBpzXTSprNgl96XPU8WSPn6I24ZCAFPLobDMvsPvEmKg2cZA91qbN5CfrUod9sbpz8VAgDYqqI-b2xmSiGHHK323UItkKaKlYX2vpwB4joxWIeswASxhxuWfyzAaX-W7CuWkEEvxN-H0ySghc0AYB_aJtaTINw5W8WHKnCnPYJHTz-3ULpfmIB18rD_QEllzZ2wO1frLQNdU7N6oGKeeO1eQJuGgxjG3Qdud6PV14w"/>
<span class="text-body-md font-semibold text-on-surface">Sophia Bennett</span>
</div>
<span class="text-body-md font-bold text-on-surface">$22.1k</span>
</div>
<div class="flex items-center justify-between py-2 border-b border-outline-variant/30">
<div class="flex items-center gap-md">
<span class="text-label-sm font-bold text-on-surface-variant w-4">7</span>
<span class="material-symbols-outlined text-error text-sm">expand_more</span>
<img class="w-8 h-8 rounded-full object-cover" data-alt="Portrait of Noah Thompson, a financial specialist. He has a serious but trustworthy demeanor, dressed in professional office attire. High-quality lighting and a minimalist background ensure he stands out as a top performer in a corporate ecosystem." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAt8pP6o625kI-bzM0BF3J9C54YW373YLgSm3vLoCIJCdan4N_eOIGzBVwReOHP5YhDzTVtVIwP4gKtXKNXWvtkhS2EX4ubA-Ae_xdunUbVluruTPWL-Xpk6ps-Lm_MoGKzZggng713cMR2odEp58G-6_5RAUvNXgFepI3JMCbNLjrwaBNQyI4QGNgSoTYKwkkpWCQzZHuG12jqxnk9svZNfaf8pdLS04esRkaXsEP_GtQO0jz1WOGQP0EgpZwL48M0VLoWI8JinA1"/>
<span class="text-body-md font-semibold text-on-surface">Noah Thompson</span>
</div>
<span class="text-body-md font-bold text-on-surface">$18.5k</span>
</div>
<div class="flex items-center justify-between py-2 border-b border-outline-variant/30">
<div class="flex items-center gap-md">
<span class="text-label-sm font-bold text-on-surface-variant w-4">8</span>
<span class="material-symbols-outlined text-outline text-sm">remove</span>
<img class="w-8 h-8 rounded-full object-cover" data-alt="Professional corporate photo of Emma Johnson, a loan processing expert. She has a bright smile and is wearing professional attire. The style is modern studio photography with clean, soft light that fits perfectly into a light-themed financial interface." src="https://lh3.googleusercontent.com/aida-public/AB6AXuADEvSYxxAn--dSgPB_oLp4ItU9UFXzicH7Ou86m8-rQfBmfoMDwQh_itCtfgF8nHO-CmbR1vgC--ObmmmYl2DMcoHFRJRXC-_xIi7fDkUlgU_jY_IjRTgqSdSbME0w-I_SssHPtbwakRUtTseEQp2sSNfiQCsd3_zvvQhRcBowhYWR0iMW2aO7qyXuRGeDdYCe1fqBKIIicQ6yoBmLl48ugSAqdjwUf_ZSHbPPrYQgWLEbH8TsEysZRwvfCWhwjcS7QuP5_A9Bdoyl"/>
<span class="text-body-md font-semibold text-on-surface">Emma Johnson</span>
</div>
<span class="text-body-md font-bold text-on-surface">$16.2k</span>
</div>
<div class="flex items-center justify-between py-2 border-b border-outline-variant/30">
<div class="flex items-center gap-md">
<span class="text-label-sm font-bold text-on-surface-variant w-4">9</span>
<span class="material-symbols-outlined text-tertiary text-sm">expand_less</span>
<img class="w-8 h-8 rounded-full object-cover" data-alt="Professional headshot of Ava Martinez, a dynamic loan officer. She looks confident and expert, set against a blurred modern office backdrop. The lighting is professional and clean, capturing a high-end corporate feel suitable for performance tracking." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhVG83LlafrdpnTesS3fOZrvO30tjPg1G3LYXx6EnFBGbDk1rqWOodI8ZMPM2GjIlY0e33CAbftEVl2ByaF4GG98g4w5ql7exMS1q5hhRP6pkf_YXHw-iClxJDABTmrSgKs-_bjv1oX-b0p3rcL_6_lHol5aPOnyHPziOpHhkzZKpTMKy3A5aEUeQQQGBx1GC9uCOMzD2ji3S6qlCdxUDfrtbnB_yRXExXgyLMXe3bwXD_eZSWLnX6W8v1D9arNMuQL7FhLAnxzL0S"/>
<span class="text-body-md font-semibold text-on-surface">Ava Martinez</span>
</div>
<span class="text-body-md font-bold text-on-surface">$10.6k</span>
</div>
<div class="flex items-center justify-between py-2">
<div class="flex items-center gap-md">
<span class="text-label-sm font-bold text-on-surface-variant w-4">10</span>
<span class="material-symbols-outlined text-outline text-sm">remove</span>
<img class="w-8 h-8 rounded-full object-cover" data-alt="Portrait of Mason Lee, an emerging talent in loan management. He is dressed in a professional shirt, with a neutral and capable expression. The photography is clean and high-fidelity, typical of executive profile imagery in a high-stakes financial environment." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrJRfc6HJDDTrzptRMPUGYlCKr1ARf9P7gMGlftMDTbnqFKbQd4zB-PtV4X3f9kfCf_zBUKWz4YYSTi7whFW9imLLr8wQkGELK9ilGkh3jMNY1rN8_voXyK8h-YeAXMcJRJywZaywuN1K9NwVc2WDTfyYNiKCtAO6DzxMycWYJoZmewqDU8IBKqTcDH3svdyRt4nOly7vhq0W0bU13dVjvyPj2qBqLIj20VhPBP_z_2MKuVJ9WlJ5Iq7FtZUHqEwPQQoi_QPu6XMUv"/>
<span class="text-body-md font-semibold text-on-surface">Mason Lee</span>
</div>
<span class="text-body-md font-bold text-on-surface">$8.7k</span>
</div>
</div>
</section>
</div>
<!-- Right Area: Top 3 Performance Cards (Col 5-12) -->
<div class="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-gutter">
<!-- Card Rank 1 -->
<div class="bg-surface-container-lowest rounded-xl custom-shadow p-lg flex flex-col relative overflow-hidden h-fit">
<div class="absolute top-4 right-6 text-display-md font-bold text-surface-container-highest/60 select-none">1</div>
<div class="mb-lg">
<p class="text-headline-sm font-bold text-on-surface">John Doe</p>
<p class="text-label-xs text-on-surface-variant">California</p>
</div>
<div class="rounded-xl overflow-hidden mb-lg aspect-square">
<img class="w-full h-full object-cover" data-alt="High-resolution professional headshot of John Doe, an elite loan officer. He is wearing a tailored navy suit and glasses, smiling confidently. The background is a sophisticated glass-walled office with morning light streaming in. The mood is highly professional and successful, typical of a top-tier financial executive leaderboard." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqgRegttaAJC32VW_1rooytP6CCLvl-zGjMX-FFYuBMIn70V2RggOdCy4nICJ7t9xXalKX_1ZKG37R9y6-y27r191PeoORXign1m6O95zL-vfjcEOCSyBCfDhAb2nw-uFHnUFMsMfaZLp1kkornM-g69Mu8ed-VBVo04ADv6OBYIz_WYuPSx_oaX7tnHNeE565RjE9bh7kP9NDzGufRutgA3asaPjnJmP07fMbAld8fusaQUxg05C3T6hohorCOdEPdwX_vPHFEpcB"/>
</div>
<div class="space-y-xl">
<!-- Metric 1 -->
<div>
<p class="text-label-sm font-bold text-on-surface-variant uppercase tracking-tight mb-sm">Total Loan Closed</p>
<p class="text-display-md font-bold text-on-surface">$102.7k</p>
<p class="text-label-xs text-on-surface-variant mb-xs">This Year</p>
<div class="w-full h-1.5 bg-surface-container-high rounded-full">
<div class="h-full bg-primary w-[85%] rounded-full"></div>
</div>
</div>
<!-- Metric 2 -->
<div>
<p class="text-display-md font-bold text-on-surface">$14.7k</p>
<p class="text-label-xs text-on-surface-variant mb-sm">This Week</p>
<div class="h-10 w-full">
<svg class="w-full h-full" preserveaspectratio="none" viewbox="0 0 100 20">
<path class="sparkline-svg" d="M0 15 Q 10 5, 20 12 T 40 8 T 60 14 T 80 10 T 100 5" fill="none" stroke="#004fbf" stroke-width="1.5"></path>
<path d="M0 15 Q 10 5, 20 12 T 40 8 T 60 14 T 80 10 T 100 5 V 20 H 0 Z" fill="url(#grad1)" opacity="0.1"></path>
<defs>
<lineargradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" style="stop-color:#004fbf;stop-opacity:1"></stop>
<stop offset="100%" style="stop-color:#004fbf;stop-opacity:0"></stop>
</lineargradient>
</defs>
</svg>
</div>
</div>
<!-- Metric 3 -->
<div>
<p class="text-label-sm font-bold text-on-surface-variant uppercase tracking-tight mb-sm">Total Deals Closed</p>
<p class="text-display-md font-bold text-on-surface">$2.3k</p>
<div class="flex items-center justify-between text-label-xs mt-1">
<span class="text-on-surface-variant">This Year</span>
<span class="text-error font-bold flex items-center">-2.5% <span class="material-symbols-outlined text-[12px] ml-0.5">arrow_downward</span></span>
</div>
</div>
</div>
</div>
<!-- Card Rank 2 -->
<div class="bg-surface-container-lowest rounded-xl custom-shadow p-lg flex flex-col relative overflow-hidden h-fit">
<div class="absolute top-4 right-6 text-display-md font-bold text-surface-container-highest/60 select-none">2</div>
<div class="mb-lg">
<p class="text-headline-sm font-bold text-on-surface">Jane Roberts</p>
<p class="text-label-xs text-on-surface-variant">Texas</p>
</div>
<div class="rounded-xl overflow-hidden mb-lg aspect-square">
<img class="w-full h-full object-cover" data-alt="Elegant corporate portrait of Jane Roberts, rank 2 performer. She has blonde hair, styled professionally, and is wearing a sleek business jacket. She is positioned in a bright, modern architectural space with clean lines and soft ambient lighting. The style is premium corporate photography that conveys trust, success, and high-performance in finance." src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0ZVYN7LGfKTOIdRB5dcamA1Iv76GVsW07ITTlbe4tnKRJ3seFi7ZBo-GW8fxWQ9pQRU9ml_YzKCT6jVMOv5coSg7Z4c4a2PSvHwuU6G6NjAwDBYvK7FS2WSFHx-hMe-Dz6BZEl5NdBEy73Ss2vRiih84WTaMzdLjNpETr18C2IbZ-ZbT7NwUeXoiG_D2fAKCv9-1MGAlJ0BFT8BuED1sBfe0b789trD1xe7FI0VtA_vsfZbBCNCRYy6xpHwTQJx2xLh_iA7PugFYY"/>
</div>
<div class="space-y-xl">
<div>
<p class="text-label-sm font-bold text-on-surface-variant uppercase tracking-tight mb-sm">Total Loan Closed</p>
<p class="text-display-md font-bold text-on-surface">$71.6k</p>
<p class="text-label-xs text-on-surface-variant mb-xs">This Year</p>
<div class="w-full h-1.5 bg-surface-container-high rounded-full">
<div class="h-full bg-primary w-[65%] rounded-full"></div>
</div>
</div>
<div>
<p class="text-display-md font-bold text-on-surface">$7.2k</p>
<p class="text-label-xs text-on-surface-variant mb-sm">This Week</p>
<div class="h-10 w-full">
<svg class="w-full h-full" preserveaspectratio="none" viewbox="0 0 100 20">
<path class="sparkline-svg" d="M0 12 Q 15 18, 30 10 T 50 14 T 70 8 T 85 12 T 100 10" fill="none" stroke="#004fbf" stroke-width="1.5"></path>
<path d="M0 12 Q 15 18, 30 10 T 50 14 T 70 8 T 85 12 T 100 10 V 20 H 0 Z" fill="url(#grad2)" opacity="0.1"></path>
<defs>
<lineargradient id="grad2" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" style="stop-color:#004fbf;stop-opacity:1"></stop>
<stop offset="100%" style="stop-color:#004fbf;stop-opacity:0"></stop>
</lineargradient>
</defs>
</svg>
</div>
</div>
<div>
<p class="text-label-sm font-bold text-on-surface-variant uppercase tracking-tight mb-sm">Total Deals Closed</p>
<p class="text-display-md font-bold text-on-surface">$900</p>
<div class="flex items-center justify-between text-label-xs mt-1">
<span class="text-on-surface-variant">This Year</span>
<span class="text-tertiary font-bold flex items-center">+0.75% <span class="material-symbols-outlined text-[12px] ml-0.5">arrow_upward</span></span>
</div>
</div>
</div>
</div>
<!-- Card Rank 3 -->
<div class="bg-surface-container-lowest rounded-xl custom-shadow p-lg flex flex-col relative overflow-hidden h-fit">
<div class="absolute top-4 right-6 text-display-md font-bold text-surface-container-highest/60 select-none">3</div>
<div class="mb-lg">
<p class="text-headline-sm font-bold text-on-surface">Manny Johnson</p>
<p class="text-label-xs text-on-surface-variant">Manes</p>
</div>
<div class="rounded-xl overflow-hidden mb-lg aspect-square">
<img class="w-full h-full object-cover" data-alt="Warm and professional studio headshot of Manny Johnson. He is a young professional with a friendly smile, wearing a clean charcoal polo shirt. The lighting is soft and flattering, with a neutral gray background that emphasizes his features. The aesthetic is clean and modern corporate, embodying the collaborative spirit of a top performer." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPuW2LDuD0EJHZ-7a1KuTx96vxvNGoHReu5Fg4o9V4UElJCWk7T5sm7ekKieef6yUiKsRyVPcLXMuosSKTdWdYNyPn2oKelLp4PfkXIFOrTmQTIpGv9PbIMuwo_iJZqLazKk8C3K-nGPcLofSQrdE6sNMIpl9iUyqvQhEbevdFew7S8YTj2swR1hT4AJo6yamKq4_A26eNJg1q8o87QaPOCzYp0n_Gij5a9DuB7EZMR0GhrFy-18vjumaVQ4kPVKoyXMQNV3uATlL2"/>
</div>
<div class="space-y-xl">
<div>
<p class="text-label-sm font-bold text-on-surface-variant uppercase tracking-tight mb-sm">Total Loan Closed</p>
<p class="text-display-md font-bold text-on-surface">$45.3k</p>
<p class="text-label-xs text-on-surface-variant mb-xs">This Year</p>
<div class="w-full h-1.5 bg-surface-container-high rounded-full">
<div class="h-full bg-primary w-[40%] rounded-full"></div>
</div>
</div>
<div>
<p class="text-display-md font-bold text-on-surface">$4.7k</p>
<p class="text-label-xs text-on-surface-variant mb-sm">This Week</p>
<div class="h-10 w-full">
<svg class="w-full h-full" preserveaspectratio="none" viewbox="0 0 100 20">
<path class="sparkline-svg" d="M0 10 Q 10 12, 25 8 T 45 14 T 65 10 T 80 15 T 100 12" fill="none" stroke="#004fbf" stroke-width="1.5"></path>
<path d="M0 10 Q 10 12, 25 8 T 45 14 T 65 10 T 80 15 T 100 12 V 20 H 0 Z" fill="url(#grad3)" opacity="0.1"></path>
<defs>
<lineargradient id="grad3" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" style="stop-color:#004fbf;stop-opacity:1"></stop>
<stop offset="100%" style="stop-color:#004fbf;stop-opacity:0"></stop>
</lineargradient>
</defs>
</svg>
</div>
</div>
<div>
<p class="text-label-sm font-bold text-on-surface-variant uppercase tracking-tight mb-sm">Total Commission Earned</p>
<p class="text-display-md font-bold text-on-surface">$745</p>
<div class="flex items-center justify-between text-label-xs mt-1">
<span class="text-on-surface-variant">This Year</span>
<span class="text-tertiary font-bold flex items-center">+1.2% <span class="material-symbols-outlined text-[12px] ml-0.5">arrow_upward</span></span>
</div>
</div>
</div>
</div>
</div>
</div>
</main>
<script>
        // Simple interactive micro-interactions
        document.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('mousedown', () => {
                el.classList.add('scale-95');
                setTimeout(() => el.classList.remove('scale-95'), 150);
            });
        });

        // Search bar focus effect
        const searchInput = document.querySelector('input[type="text"]');
        searchInput.addEventListener('focus', () => {
            searchInput.parentElement.classList.add('ring-2', 'ring-primary');
        });
        searchInput.addEventListener('blur', () => {
            searchInput.parentElement.classList.remove('ring-2', 'ring-primary');
        });
    </script>
</body></html>