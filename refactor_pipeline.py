
import os

file_path = '/Users/andreeanegru/Erasmus+ Projekte/erasmus-architect-demo/src/components/pipeline/ProjectPipeline.tsx'

with open(file_path, 'r') as f:
    lines = f.readlines()

start_marker = '{/* Mode Toggle & Actions */}'
end_marker = '{/* Answer Area */}'

# We want to remove from start_marker (inclusive) up to (but not including) end_marker.
# But we need to keep the last closing div of the previous block?
# Let's look at the context.
# 1809: empty line
# 1810: {/* Mode Toggle & Actions */}
# ...
# 1860:                             </div>
# 1861: 
# 1862:                             {/* Answer Area */}

# The block to remove is the div that contains Mode Toggle & Actions.
# It seems to be formatted as:
# <div ...> (wrapping Mode Toggle & Actions)
#   <Button ...>
# </div>

# Wait, in the view_file:
# 1807:                                   </div>
# 1808:                                 </div>
# 1809: 
# 1810:                                 {/* Mode Toggle & Actions */}
# 1811:                                 <div className="flex flex-col gap-3 shrink-0 min-w-[150px]">
# ...
# 1858:                                 </div>
# 1859:                               </div>
# 1860:                             </div>
# 1861: 
# 1862:                             {/* Answer Area */}

# So we want to remove lines 1810 to 1858 (inclusive). 
# Line 1859 is `                              </div>`. This seems to close a div started BEFORE 1810?
# No, look at indentation.
# 1811: <div ...> (32 spaces)
# 1858: </div> (32 spaces)
# So 1811 closes at 1858.
# 1810 is the comment.
# So we remove 1810 to 1858.

# Let's find the line index.
start_index = -1
for i, line in enumerate(lines):
    if start_marker in line:
        start_index = i
        break

if start_index == -1:
    print("Start marker not found")
    exit(1)

# Now find where the list of buttons ends.
# We can look for the line 1858 which is `                                </div>` (32 spaces).
# Or we can count braces? No, it's safer to find the next section "Answer Area" and backtrack.
end_answer_area_index = -1
for i in range(start_index, len(lines)):
    if end_marker in line: # This won't work because `i` is not updated
        pass

for i in range(start_index, len(lines)):
    if end_marker in lines[i]:
        end_answer_area_index = i
        break

if end_answer_area_index == -1:
    print("End marker not found")
    exit(1)

# We want to remove from start_index.
# And we want to stop BEFORE the Answer Area.
# But we need to check the lines between.
# 1860 is `                            </div>`.
# 1861 is empty.
# 1862 is Answer Area.
# The block we want to remove ends at 1858.
# 1859 is `                              </div>`. This looks like it closes `1808`? No, 1808 is `                                </div>`.
# Let's check matching divs in the range.

# Actually, I will explicitly remove the known lines if they match the content I expect.
button_div_start = '                                <div className="flex flex-col gap-3 shrink-0 min-w-[150px]">'
button_div_end = '                                </div>'

# Verify content
if button_div_start.strip() not in lines[start_index+1]:
   print(f"Mismatch at start+1: {lines[start_index+1]}")

# We will remove from start_index up to the line that matches button_div_end with correct indentation.
indent = '                                ' # 32 spaces
target_end_line = indent + '</div>\n'

found_end = -1
for i in range(start_index + 1, end_answer_area_index):
    if lines[i] == target_end_line:
        found_end = i
        # But there might be nested divs?
        # The internal divs (Buttons) don't have this indentation.
        # So finding the first closing div with 32 spaces after start_index+1 might work.
        break

if found_end != -1:
    print(f"Removing lines {start_index} to {found_end}")
    # Remove lines
    del lines[start_index:found_end+1]
    
    with open(file_path, 'w') as f:
        f.writelines(lines)
    print("Successfully removed block")
else:
    print("Could not find closing div")
