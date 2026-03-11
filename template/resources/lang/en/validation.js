export default {
  required: 'The :field field is required.',
  string: 'The :field field must be a string.',
  integer: 'The :field field must be an integer.',
  boolean: 'The :field field must be true or false.',
  array: 'The :field field must be an array.',
  email: 'The :field field must be a valid email address.',
  min: 'The :field field must be at least :min.',
  max: 'The :field field must be at most :max.',
  alpha_spaces: 'The :field field may only contain letters and spaces.',
  password: 'The :field field must be a strong password.',

  file: 'The :field field must be a file.',
  mimes: 'The :field field must be a file of type: :values.',
  image: 'The :field field must be an image.',
  dimensions: 'The :field field has invalid image dimensions.',

  required_if: 'The :field field is required when :other is :value.',
  required_unless: 'The :field field is required unless :other is :value.',
  required_with: 'The :field field is required when :values is present.',
  required_without: 'The :field field is required when :values is not present.'
}

