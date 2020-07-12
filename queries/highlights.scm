(module_identifier) @namespace
(struct_identifier) @struct
(function_identifier) @function
(variable_identifier) @variable
(spec_pragma_property
  (identifier) @variable)
(spec_variable
  name: (identifier) @variable)
(constant
  name: (constant_identifier) @property.static.constant)

(func_params
  (function_parameter
    name: (variable_identifier) @parameter.modification
    type: (ref_type
            mutable: "&mut")))
(func_params
  (function_parameter
    name: (variable_identifier) @parameter.readonly
    type: (ref_type
            mutable: "&")))

(type_parameter_identifier) @typeParameter
(field_identifier) @member

(binary_expression
  operator: (binary_operator) @operator)
(unary_op) @operator

(line_comment) @comment
(
  (line_comment) @comment.documentation
  (#match? @comment.documentation "^\\\/\\\/\\\/([^/].*)?$")
)
(block_comment) @comment
(
  (block_comment) @comment.documentation
  (#match? @comment.documentation "^\\\/\\\*\\\*(\\n|[^*].*)")
)

(address_literal) @number
(num_literal) @number
(byte_string_literal) @string
(hex_string_literal) @string

(spec_apply_name_pattern) @struct
(name_expression
  	(module_access
        (identifier) @variable))
(bind_unpack
  (module_access
    (identifier) @struct))
(resource_accquires
  (module_access
    (identifier) @struct))
(apply_type
  (module_access
    (identifier) @struct))

"const" @keyword
"as" @keyword
"address" @keyword
"script" @keyword
"use" @keyword
"module" @keyword
"native" @keyword
"resource" @keyword
"struct" @keyword
"public" @keyword
"fun" @keyword
"acquires" @keyword
"spec" @keyword
"schema" @keyword
"invariant" @keyword
"include" @keyword
"apply" @keyword
"to" @keyword
"internal" @keyword
"pragma" @keyword
"global" @keyword
"local" @keyword
"define" @keyword
"copy" @keyword
"move" @keyword
"let" @keyword
"if" @keyword
"else" @keyword
"while" @keyword
"loop" @keyword
"return" @keyword
"abort" @keyword
"break" @keyword
"continue" @keyword
