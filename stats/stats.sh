#!/bin/bash

. "$DIR/../$NIGHTLY/maintainer/upload.conf.sh"

# LOGDATE=$(date --date="1 day ago" -u +%d/%b/%Y)
LOGDATE=$(date --date='1 day ago' -u +%Y-%b-%d)
JSONDATE=$(date --date="1 day ago" -u +%Y%m%d)

echo "do $JSONDATE"
echo "updating JSON"
# update the json logs from ftp

scp server:"${DEST}/../"{stats-archive-update,stats-archive-foxtrick} ./ || exit 3

# exit if date already exists
grep -q $JSONDATE stats-archive-update stats-archive-foxtrick && \
  echo "$JSONDATE already exists" && exit 2

# fetch logwatch
scp server:"${DEST}"/../../logwatch.log ./ || exit 3

# exit if date mismatch
grep -qP "^\s*\( $LOGDATE \)" logwatch.log || \
  (echo "$LOGDATE is missing in logwatch"; false) || exit 2

declare -A update foxtrick
update[firefox]="update.rdf"
update[chrome]="chrome/update.xml"
update[opera]="opera/update.xml"
update[safari]="safari/update.plist"

foxtrick[firefox]="[^/]+\\.xpi"
foxtrick[chrome]="chrome/[^/]+\\.crx"
foxtrick[opera]="opera/[^/]+\\.oex"
foxtrick[safari]="safari/[^/]+\\.safariextz"

for FILE in update foxtrick; do
  LINE=",\"${JSONDATE}\":{"
  FIRST=1
  for BROWSER in $(eval echo \${!${FILE}[*]}); do
    for CHANNEL in release nightly beta light; do
      server_path="/${CHANNEL}/$(eval echo \${$FILE[$BROWSER]})"
      count=$(grep -P "$server_path" logwatch.log | grep -Po '\d+(?= Time\(s\))' | \
        awk 'BEGIN {s=0} {s+=$1} END {print s}')

      if [ "$FIRST" -eq 0 ]
      then
        LINE="${LINE},"
      fi
      FIRST=0

      LINE="${LINE}\"${BROWSER}_${CHANNEL}\":${count}"

      # end CHANNEL
    done
    # end BROWSER
  done

  LINE="${LINE}}}"

  # remove last } and the ws after (so that the new } stays in the top line)
  sed -i -r 's|}}|}|' "stats-archive-${FILE}"
  echo "$LINE" >> "stats-archive-${FILE}"

  # end FILE
done

scp stats-archive-update stats-archive-foxtrick server:"${DEST}/../" || exit 3


# for logfile in stats-archive-update stats-archive-foxtrick
# do
# 	cp access-ftp-tmpl access-ftp-down
# 	sed -i "s|{HOST}|${HOST}|" access-ftp-down
# 	sed -i "s|{USER}|${USER}|" access-ftp-down
# 	sed -i "s|{PSWD}|${PASSWORD}|" access-ftp-down
# 	sed -i "s|{DIR}|htdocs|" access-ftp-down
# 	sed -i "s|{FILE}|${logfile}|" access-ftp-down
# 	lftp -f access-ftp-down || exit 3
# 	rm access-ftp-down
# 	# exit if date already exists
# 	grep -c $JSONDATE $logfile && echo "$JSONDATE already exists" && exit
# done

# # get yesterday info and add it to stats archive
# ACCESS_LOG=foxtrick.org-access.log
# ACCESS_LOG_CLEANED=foxtrick.org-access.log-cleaned

# echo "Fetching log"

# # setup templates
# cp access-ftp-tmpl access-ftp-down
# cp stats-upload-ftp-tmpl stats-upload-ftp-temp
# sed -i "s|{HOST}|${HOST}|" access-ftp-down stats-upload-ftp-temp
# sed -i "s|{USER}|${USER}|" access-ftp-down stats-upload-ftp-temp
# sed -i "s|{PSWD}|${PASSWORD}|" access-ftp-down stats-upload-ftp-temp

# # download last access file
# sed -i "s|{DIR}|logs|" access-ftp-down
# sed -i "s|{FILE}|${ACCESS_LOG}|" access-ftp-down
# lftp -f access-ftp-down || exit 3
# rm access-ftp-down

# kick invalid bots, android, iphone, ipad. fennec count uses original
# echo "cleanup"
# grep -ive "android\|iphone\|ipad\|bot\|spider\|Mediapartners-Google" "$ACCESS_LOG"> "$ACCESS_LOG_CLEANED"

# BROWSERS="firefox chrome opera safari"
# VERSIONS="release nightly beta"

# for file in update foxtrick
# do
#   echo "do $file"
#   FIRST=0
#   LINE=,'"'"$JSONDATE"'":{'

#   for BROWSER in $BROWSERS
#   do
#     if [ "$BROWSER" != "firefox" ]
#     then
#       SUB="/$BROWSER"
#     else
#       SUB=""
#     fi
#     for VERSION in $VERSIONS
#     do
#       if [ "$FIRST" -ne 0 ]
#       then
#         LINE="$LINE",
#       fi
#       FIRST=1
#       LINE="$LINE"'"'"$BROWSER"_"$VERSION"'":'$(grep "/""$VERSION""$SUB""/$file" "$ACCESS_LOG_CLEANED" | grep -v "Fennec" | grep -c "$LOGDATE")
#     done
#   done
#   LINE="$LINE"',"'light'":'$(grep "/light" "$ACCESS_LOG_CLEANED" | grep "/$file" | grep -c "$LOGDATE")
#   LINE="$LINE"',"'fennec-tablet'":'$(grep "Fennec" "$ACCESS_LOG" | grep "/$file" | grep "Android; Tablet;" | grep -c "$LOGDATE")
#   LINE="$LINE"',"'fennec-mobile'":'$(grep "Fennec" "$ACCESS_LOG" | grep "/$file" | grep "Android; Mobile;" | grep -c "$LOGDATE")
#   LINE="$LINE"',"'fennec-unknown'":'$(grep "Fennec" "$ACCESS_LOG" | grep "/$file" | grep "Android; Linux armv7l;" | grep -c "$LOGDATE")

#   LINE="$LINE"}}
#   echo "$LINE" > stats-yesterday
#   #remove last } and the ws after (so that the new } stays in the top line). not working
# #  sed -i -r 's|\n||' stats-archive-"$file"
# #  sed -i -r 's|}\s+?$||' stats-archive-"$file"
#   sed -i -r 's|}}|}|' stats-archive-"$file"
#   cat stats-archive-"$file" stats-yesterday > stats-tmp
#   cp -f stats-tmp stats-archive-"$file"
#   rm -f stats-tmp

#   # upload new stats
#   echo "uploading stats-archive-$file"
#   cp -f stats-upload-ftp-temp ftp
#   sed -i \
#     -e "s|{FILE}|stats-archive-${file}|g" ftp
#   lftp -f ftp || exit 3
#   rm ftp
# done

# rm stats-upload-ftp-temp

exit
