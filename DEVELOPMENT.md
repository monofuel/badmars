## Code Quality

- make check should always return valid on master
	- (it's also under heavy development, so this may be not be true..)

## Atom Configuration

# go

- go-plus
 - go fmt on save

# javascript

- install a flow plugin of choice
- install atom-beautify and configure for javascript and json:
	- beautify on save
	- brace style: collapse-preserve-inline
	- end with comma
	- end with newline
	- indent with tabs (or i will eject you into space)
	- jslint happy
	- keep array indentation
	- preserve newlines
	- space after annon function

- javascript is not currently linted, so atom-beautify is not enforced.
 - TODO find a linter that cooperates with flowtype

- personal rules enforced by codeCleanup.sh
	- use imports over require in babelified files for consistency
	- strict mode is added by babel, so do not use it.
	- all files should be flowtyped (in progress)
		- any and object should be discouraged (not yet checked)
