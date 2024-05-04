module.exports = {
	root: true,
	env: { browser: true, es2020: true },
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:react-hooks/recommended',
		'plugin:import/errors',
		'plugin:import/warnings',
		'plugin:import/typescript',
		'plugin:react/recommended',
		'prettier',
		'plugin:prettier/recommended',
	],
	ignorePatterns: ['dist', '.eslintrc.cjs'],
	parser: '@typescript-eslint/parser',
	plugins: ['react-refresh'],
	rules: {
		'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
		// react17以降はReactのimport不要
		'react/react-in-jsx-scope': 'off',
		// react-hooks
		'react-hooks/rules-of-hooks': 'error',
		'react-hooks/exhaustive-deps': 'warn',
		// 改行コード
		'linebreak-style': ['error', 'unix'],
		// import文の順序
		'import/order': [
			'error',
			{
				groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
				// importグループごとに改行する
				'newlines-between': 'always',
				// 各グループ内の順序をアルファベット順に並べ替える
				alphabetize: { order: 'asc', caseInsensitive: true },
			},
		],
	},
};
