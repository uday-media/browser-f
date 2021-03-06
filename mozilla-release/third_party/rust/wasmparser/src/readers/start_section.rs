/* Copyright 2018 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

use super::{BinaryReader, BinaryReaderError, Result};

pub(crate) fn read_start_section_content(data: &[u8], offset: usize) -> Result<u32> {
    let mut reader = BinaryReader::new_with_offset(data, offset);
    let start_index = reader.read_var_u32()?;
    if !reader.eof() {
        return Err(BinaryReaderError::new(
            "Unexpected content in the start section",
            offset + reader.position,
        ));
    }
    Ok(start_index)
}
